import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  findCatalogBookByIsbn,
  getCachedSearch,
  saveSearch,
  searchCacheKey,
  type CatalogEntry,
} from "@/lib/book-catalog";

const searchLimiter = createRateLimiter("books-search", 30, 60);

interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  pageCount?: number;
  publishedDate?: string;
  categories?: string[];
  industryIdentifiers?: { type: string; identifier: string }[];
}

interface GoogleBooksItem {
  id: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

/** Raison pour laquelle la recherche distante n'a rien pu renvoyer, exposée au client. */
type Unavailable = "API_LIMIT_EXCEEDED" | "API_UNAVAILABLE" | "API_ERROR";

const RETRYABLE_STATUSES = [502, 503, 504];

/**
 * Google Books renvoie régulièrement des 502/503/504 passagers. Trois tentatives avec un
 * backoff exponentiel (300ms, 600ms, 1200ms) suffisent à les absorber sans faire attendre
 * l'utilisateur plus de deux secondes environ.
 */
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (RETRYABLE_STATUSES.includes(response.status) && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
      }
    }
  }

  throw lastError ?? new Error("Google Books unreachable after retries");
}

function buildUrl(query: string): string {
  const params = new URLSearchParams({ q: query, maxResults: "10", printType: "books" });
  if (env.GOOGLE_BOOKS_API_KEY) params.set("key", env.GOOGLE_BOOKS_API_KEY);
  return `https://www.googleapis.com/books/v1/volumes?${params}`;
}

function toBook(item: GoogleBooksItem): CatalogEntry {
  const info = item.volumeInfo ?? {};
  const identifiers = info.industryIdentifiers ?? [];
  // ISBN-13 prioritaire sur ISBN-10 : c'est le format des codes-barres scannés.
  const isbn =
    identifiers.find((id) => id.type === "ISBN_13")?.identifier ??
    identifiers.find((id) => id.type === "ISBN_10")?.identifier ??
    null;
  const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;

  return {
    id: item.id,
    title: info.title ?? "Sans titre",
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? ["Auteur inconnu"],
    description: info.description ?? null,
    // Google renvoie encore des URLs en http: ; les réécrire évite le contenu mixte.
    coverUrl: cover?.replace(/^http:/, "https:") ?? null,
    pageCount: info.pageCount ?? null,
    publishedDate: info.publishedDate ?? null,
    isbn,
    genres: info.categories ?? null,
  };
}

type GoogleResult = { books: CatalogEntry[] } | { unavailable: Unavailable; message: string };

/** Interroge Google Books, avec le repli en texte libre pour les ISBN introuvables. */
async function searchGoogle(search: { isbn: string } | { q: string }): Promise<GoogleResult> {
  try {
    let response = await fetchWithRetry(
      buildUrl("isbn" in search ? `isbn:${search.isbn}` : search.q),
    );

    // L'index `isbn:` de Google est strict et ignore certains codes pourtant valides ;
    // une recherche en texte libre sur le numéro nu les retrouve souvent.
    if ("isbn" in search && response.ok) {
      const firstTry = await response.clone().json();
      if (!firstTry.items?.length) {
        const fallback = await fetchWithRetry(buildUrl(search.isbn));
        if (fallback.ok) response = fallback;
      }
    }

    if (response.status === 429) {
      return {
        unavailable: "API_LIMIT_EXCEEDED",
        message: "Le quota de l'API Google Books est dépassé. Utilisez la saisie manuelle.",
      };
    }

    if (RETRYABLE_STATUSES.includes(response.status)) {
      return {
        unavailable: "API_UNAVAILABLE",
        message:
          "Le service Google Books est momentanément indisponible. Réessayez ou saisissez le livre à la main.",
      };
    }

    if (!response.ok) {
      logger.error({ status: response.status }, "Google Books API returned an unexpected status");
      return {
        unavailable: "API_ERROR",
        message: "Erreur lors de la recherche. Utilisez la saisie manuelle.",
      };
    }

    const data = (await response.json()) as { items?: GoogleBooksItem[] };
    return { books: (data.items ?? []).map(toBook) };
  } catch (err) {
    logger.error({ err }, "Google Books search failed");
    return {
      unavailable: "API_ERROR",
      message: "Erreur lors de la recherche. Utilisez la saisie manuelle.",
    };
  }
}

/**
 * Recherche de livres par texte libre (`q`) ou par ISBN (`isbn`).
 *
 * Le catalogue partagé (`lib/book-catalog.ts`) est consulté avant Google Books, dont le
 * quota quotidien est limité : un ISBN déjà connu, ou une recherche déjà faite par un autre
 * utilisateur, ne coûte aucun appel. Seules les réponses réussies de Google sont mises en
 * cache — une panne ou un quota dépassé ne doit pas rester mémorisé.
 *
 * Réservée aux utilisateurs connectés — la route consomme le quota de notre clé API, et son
 * seul appelant est l'écran d'ajout, lui-même protégé.
 *
 * Une indisponibilité de Google Books n'est pas une erreur de cette route : elle répond
 * quand même en succès, avec une liste vide et un motif dans `unavailable`, pour que l'écran
 * d'ajout bascule sur la saisie manuelle au lieu d'afficher une erreur sans issue.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await searchLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de recherches. Réessayez dans une minute.");
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const isbn = searchParams.get("isbn")?.replace(/[-\s]/g, "");

  if (!query && !isbn) {
    return apiError("VALIDATION_ERROR", "Un titre ou un ISBN est requis.");
  }

  const search = isbn ? { isbn } : { q: query! };
  const found = (books: CatalogEntry[]) => apiSuccess({ books, unavailable: null });

  if (isbn) {
    const known = await findCatalogBookByIsbn(isbn);
    if (known) return found([known]);
  }

  const key = searchCacheKey(search);
  const cached = await getCachedSearch(key);
  if (cached) return found(cached);

  const result = await searchGoogle(search);
  if ("unavailable" in result) {
    return apiSuccess({ books: [], unavailable: result.unavailable }, result.message);
  }

  try {
    await saveSearch(key, result.books);
  } catch (err) {
    // Le cache n'est qu'une économie de quota : son échec ne prive pas l'utilisateur des
    // résultats déjà obtenus.
    logger.error({ err }, "Failed to cache book search results");
  }

  return found(result.books);
});
