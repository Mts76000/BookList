import { getCachedSearch, saveSearch, type CatalogEntry } from "@/lib/book-catalog";
import { searchBooks } from "@/lib/book-search";
import { bestIsbn, pickEdition } from "@/lib/edition-match";
import { normalizeText } from "@/lib/series-detection";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Ce qu'on reprend d'une édition pour créer un tome dans la bibliothèque. */
export type Edition = Pick<
  CatalogEntry,
  "isbn" | "coverUrl" | "description" | "pageCount" | "publishedDate" | "genres"
>;

const OPEN_LIBRARY_TIMEOUT_MS = 8000;

/**
 * Clé de cache d'un choix d'édition : le tome, son auteur et la collection visée (le début
 * de l'ISBN de référence). Deux lecteurs de la même collection partagent le résultat.
 */
function editionKey(title: string, author: string, preferred: string[]): string {
  const collection = preferred[0]?.replace(/[^0-9]/g, "").slice(0, 9) || "fr";
  return `edition:${normalizeText(title)}|${normalizeText(author)}|${collection}`;
}

interface OpenLibraryEdition {
  title?: string;
  isbn?: string[];
  cover_i?: number;
  publish_date?: string[];
}

/** Le nom de famille de l'auteur figure-t-il parmi les auteurs de l'œuvre ? */
function sameAuthor(author: string, names: string[] | undefined): boolean {
  const lastName = normalizeText(author).split(" ").pop();
  if (!lastName || !names?.length) return true;
  return names.some((name) => normalizeText(name).split(" ").includes(lastName));
}

/**
 * Repli quand Google Books ne répond pas (quota épuisé) ou ne trouve pas le tome. Open
 * Library range les œuvres sous leur titre original, mais renvoie pour chacune l'édition
 * qui correspond au titre cherché : « Harry Potter et le prisonnier d'Azkaban », Gallimard,
 * avec sa couverture française. On garde celle dont l'ISBN est le plus proche de la
 * collection des tomes possédés.
 */
async function searchOpenLibrary(
  title: string,
  author: string,
  preferred: string[],
): Promise<CatalogEntry | null> {
  const params = new URLSearchParams({
    q: title,
    fields:
      "key,author_name,editions,editions.key,editions.title,editions.isbn,editions.cover_i,editions.publish_date",
    limit: "5",
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { "User-Agent": `BookList/1.0 (${env.NEXT_PUBLIC_APP_URL})` },
    signal: AbortSignal.timeout(OPEN_LIBRARY_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Open Library a répondu ${response.status}`);
  const data = (await response.json()) as {
    docs?: { key?: string; author_name?: string[]; editions?: { docs?: OpenLibraryEdition[] } }[];
  };

  const candidates = (data.docs ?? [])
    .filter((work) => sameAuthor(author, work.author_name))
    .flatMap((work) => work.editions?.docs ?? [])
    .filter((edition) => edition.title)
    .map((edition) => ({
      title: edition.title!,
      isbn: bestIsbn(edition.isbn ?? [], preferred),
      coverUrl: edition.cover_i
        ? `https://covers.openlibrary.org/b/id/${edition.cover_i}-L.jpg`
        : null,
      year: edition.publish_date?.[0]?.match(/\d{4}/)?.[0] ?? null,
    }));
  const chosen = pickEdition(candidates, title, preferred);
  if (!chosen) return null;

  return {
    id: `ol:${chosen.isbn ?? normalizeText(`${title} ${author}`)}`,
    isbn: chosen.isbn,
    title,
    subtitle: null,
    authors: [author],
    description: null,
    coverUrl: chosen.coverUrl,
    pageCount: null,
    publishedDate: chosen.year,
    genres: null,
  };
}

/**
 * L'édition d'un tome à ajouter, dans la collection des tomes de référence quand c'est
 * possible : Google Books (via le catalogue partagé), puis Open Library. Le choix est mis en
 * cache comme une recherche ; une panne des deux services ne l'est pas.
 */
export async function findEdition(
  title: string,
  author: string,
  preferred: string[],
): Promise<Edition | null> {
  const key = editionKey(title, author, preferred);
  const cached = await getCachedSearch(key);
  if (cached) return cached[0] ?? null;

  let chosen: CatalogEntry | null = null;
  const google = await searchBooks({ q: `${title} ${author}` });
  chosen = pickEdition(google.books, title, preferred);

  if (!chosen?.coverUrl) {
    try {
      chosen = (await searchOpenLibrary(title, author, preferred)) ?? chosen;
    } catch (err) {
      logger.warn({ err }, "Open Library edition lookup failed");
      // Aucune source n'a répondu : rien à mémoriser, on retentera.
      if (google.unavailable) return chosen;
    }
  }

  try {
    await saveSearch(key, chosen ? [chosen] : []);
  } catch (err) {
    logger.error({ err }, "Failed to cache edition lookup");
  }
  return chosen;
}
