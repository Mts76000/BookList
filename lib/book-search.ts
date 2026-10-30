import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCachedSearch, saveSearch, searchCacheKey, type CatalogEntry } from "@/lib/book-catalog";
import {
  bnfByIsbn,
  openLibraryByIsbn,
  openLibrarySearch,
  validPageCount,
} from "@/lib/book-sources";
import { sameIsbn, toIsbn13 } from "@/lib/isbn";
import { normalizeText } from "@/lib/series-detection";

interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  pageCount?: number;
  /** Pages de l'édition imprimée, plus juste que `pageCount` quand Google la connaît. */
  printedPageCount?: number;
  publishedDate?: string;
  categories?: string[];
  industryIdentifiers?: { type: string; identifier: string }[];
}

interface GoogleBooksItem {
  id: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

/** Raison pour laquelle la recherche distante n'a rien pu renvoyer, exposée au client. */
export type Unavailable = "API_LIMIT_EXCEEDED" | "API_UNAVAILABLE" | "API_ERROR";

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

function buildUrl(query: string, maxResults = 10): string {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
    printType: "books",
  });
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
    // Vide plutôt qu'un « Auteur inconnu » : une autre source peut le connaître (voir
    // `withAuthors`).
    authors: info.authors ?? [],
    description: info.description ?? null,
    // Google renvoie encore des URLs en http: ; les réécrire évite le contenu mixte. Le
    // coin corné (`edge=curl`) dessiné par Google n'a rien à faire sur une couverture.
    coverUrl: cover?.replace(/^http:/, "https:").replace("&edge=curl", "") ?? null,
    pageCount: validPageCount(info.printedPageCount) ?? validPageCount(info.pageCount),
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
      "isbn" in search ? buildUrl(`isbn:${search.isbn}`) : buildUrl(search.q, 20),
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

type SearchResult = { books: CatalogEntry[]; unavailable: Unavailable | null; message?: string };

/** Échec d'une source secondaire : journalisé, jamais remonté à l'utilisateur. */
function orNull<T>(source: string, promise: Promise<T>): Promise<T | null> {
  return promise.catch((err: unknown) => {
    logger.warn({ err, source }, "Book source lookup failed");
    return null;
  });
}

function withAuthors(entry: CatalogEntry): CatalogEntry {
  return entry.authors.length > 0 ? entry : { ...entry, authors: ["Auteur inconnu"] };
}

/** Résultat Google le plus complet : couverture, pages et résumé. */
function mostComplete(entries: CatalogEntry[]): CatalogEntry | null {
  const score = (entry: CatalogEntry) =>
    (entry.coverUrl ? 4 : 0) + (entry.pageCount ? 2 : 0) + (entry.description ? 1 : 0);
  return entries.reduce<CatalogEntry | null>(
    (best, entry) => (!best || score(entry) > score(best) ? entry : best),
    null,
  );
}

/**
 * Un ISBN, interrogé sur les trois sources à la fois, donne une seule fiche fusionnée :
 * - titre, auteurs, résumé et genres de Google en priorité (les plus complets) ;
 * - couverture de Google, sinon d'Open Library (Google n'en a souvent aucune pour un ISBN
 *   français) ;
 * - nombre de pages de la BnF, sinon d'Open Library, sinon de Google : la notice du dépôt
 *   légal décrit l'édition imprimée exacte, Google souvent une autre.
 * L'ISBN retenu est toujours celui demandé (le code-barres scanné), sous sa forme ISBN-13.
 */
async function lookupIsbn(isbn: string): Promise<SearchResult & { partial: boolean }> {
  const [google, openLibrary, bnf] = await Promise.all([
    searchGoogle({ isbn }),
    orNull("openlibrary", openLibraryByIsbn(isbn)),
    orNull("bnf", bnfByIsbn(isbn)),
  ]);
  // Le repli en texte libre de Google peut ramener d'autres livres que celui scanné.
  const fromGoogle = mostComplete(
    "books" in google ? google.books.filter((entry) => sameIsbn(entry.isbn, isbn)) : [],
  );
  const sources = [fromGoogle, openLibrary, bnf].filter((entry): entry is CatalogEntry => !!entry);
  const partial = "unavailable" in google || openLibrary === null || bnf === null;

  if (sources.length === 0) {
    if ("unavailable" in google) {
      return { books: [], unavailable: google.unavailable, message: google.message, partial };
    }
    return { books: [], unavailable: null, partial };
  }

  const first = <K extends keyof CatalogEntry>(field: K) =>
    sources.map((entry) => entry[field]).find((value) => value !== null) ?? null;
  const base = sources[0];
  const merged: CatalogEntry = {
    ...base,
    isbn,
    subtitle: first("subtitle"),
    authors: sources.find((entry) => entry.authors.length > 0)?.authors ?? [],
    description: first("description"),
    coverUrl: first("coverUrl"),
    pageCount: bnf?.pageCount ?? openLibrary?.pageCount ?? fromGoogle?.pageCount ?? null,
    publishedDate: first("publishedDate"),
    genres: first("genres"),
  };
  if (!merged.coverUrl && merged.authors.length > 0) {
    merged.coverUrl = await findCoverElsewhere(merged);
  }
  return { books: [withAuthors(merged)], unavailable: null, partial };
}

/**
 * Couverture d'une autre édition de la même œuvre, quand l'ISBN scanné n'en a aucune nulle
 * part : mieux vaut la couverture d'une édition voisine qu'une couverture générée. Open
 * Library d'abord (sans quota), puis Google.
 */
async function findCoverElsewhere(entry: CatalogEntry): Promise<string | null> {
  const author = entry.authors[0] ?? "";
  const fromOpenLibrary = await orNull(
    "openlibrary",
    openLibrarySearch(`${entry.title} ${author}`),
  );
  const cover = fromOpenLibrary?.find((other) => other.coverUrl && sameWork(entry, other));
  if (cover) return cover.coverUrl;

  const lastName = author.split(" ").pop() ?? "";
  const google = await searchGoogle({ q: `intitle:${entry.title} inauthor:${lastName}` });
  if ("unavailable" in google) return null;
  return google.books.find((other) => other.coverUrl && sameWork(entry, other))?.coverUrl ?? null;
}

/** Même œuvre : titre identique (sans casse ni accents) et un nom d'auteur en commun. */
function sameWork(a: CatalogEntry, b: CatalogEntry): boolean {
  if (normalizeText(a.title) !== normalizeText(b.title)) return false;
  const names = new Set(a.authors.flatMap((name) => normalizeText(name).split(" ")));
  return b.authors.some((name) =>
    normalizeText(name)
      .split(" ")
      .some((word) => word.length > 2 && names.has(word)),
  );
}

/**
 * Recherche texte : Google Books et Open Library en parallèle. Les résultats de Google
 * gardent leur ordre (le plus pertinent) et récupèrent couverture, ISBN ou pages d'Open
 * Library quand ils n'en ont pas ; les livres que seul Open Library connaît suivent.
 */
async function searchText(q: string): Promise<SearchResult & { partial: boolean }> {
  const [google, openLibrary] = await Promise.all([
    searchGoogle({ q }),
    orNull("openlibrary", openLibrarySearch(q)),
  ]);
  const partial = "unavailable" in google || openLibrary === null;

  if ("unavailable" in google && !openLibrary?.length) {
    return { books: [], unavailable: google.unavailable, message: google.message, partial };
  }

  const books = "books" in google ? [...google.books] : [];
  for (const entry of openLibrary ?? []) {
    const index = books.findIndex((candidate) => sameWork(candidate, entry));
    if (index === -1) {
      books.push(entry);
      continue;
    }
    const match = books[index];
    books[index] = {
      ...match,
      coverUrl: match.coverUrl ?? entry.coverUrl,
      isbn: match.isbn ?? entry.isbn,
      pageCount: match.pageCount ?? entry.pageCount,
    };
  }
  return { books: rankByRelevance(books, q).map(withAuthors), unavailable: null, partial };
}

/**
 * Remonte les résultats dont le titre et l'auteur contiennent les mots cherchés. Google
 * renvoie parfois des livres sans rapport en tête (une faute d'accent suffit), et le bon
 * livre, trouvé par Open Library, finissait en bas de liste. À pertinence égale, l'ordre
 * des sources est conservé (tri stable).
 */
function rankByRelevance(books: CatalogEntry[], q: string): CatalogEntry[] {
  const words = normalizeText(q)
    .split(" ")
    .filter((word) => word.length > 1);
  if (words.length === 0) return books;
  const score = (entry: CatalogEntry) => {
    const text = ` ${normalizeText(`${entry.title} ${entry.subtitle ?? ""} ${entry.authors.join(" ")}`)} `;
    const found = words.filter((word) => text.includes(` ${word} `)).length;
    return found / words.length;
  };
  return books
    .map((entry) => ({ entry, score: score(entry) }))
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
}

/**
 * Recherche de livres par texte libre ou par ISBN, partagée par la route de recherche et la
 * complétion des sagas.
 *
 * Le catalogue partagé (`lib/book-catalog.ts`) est consulté avant les sources distantes,
 * dont Google Books et son quota quotidien limité : une recherche déjà faite par un autre
 * utilisateur ne coûte aucun appel. Seules les réponses réussies sont mises en cache — une
 * panne ou un quota dépassé ne doit pas rester mémorisé.
 */
export async function searchBooks(search: { isbn: string } | { q: string }): Promise<SearchResult> {
  // Un ISBN-10 et son ISBN-13 partagent la même entrée de cache.
  const isbn = "isbn" in search ? (toIsbn13(search.isbn) ?? search.isbn) : null;
  const key = searchCacheKey(isbn ? { isbn } : search);
  const cached = await getCachedSearch(key);
  if (cached) return { books: cached, unavailable: null };

  const result = isbn ? await lookupIsbn(isbn) : await searchText((search as { q: string }).q);
  if (result.unavailable) {
    return { books: [], unavailable: result.unavailable, message: result.message };
  }

  try {
    await saveSearch(key, result.books, { partial: result.partial });
  } catch (err) {
    // Le cache n'est qu'une économie de quota : son échec ne prive pas l'utilisateur des
    // résultats déjà obtenus.
    logger.error({ err }, "Failed to cache book search results");
  }
  return { books: result.books, unavailable: null };
}
