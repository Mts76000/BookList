import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogBook, catalogSearch } from "@/drizzle/schema";

/** Un livre du catalogue, au format renvoyé au client par la recherche. */
export type CatalogEntry = Omit<typeof catalogBook.$inferSelect, "createdAt" | "updatedAt">;

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Une recherche fructueuse reste en cache une semaine : assez pour absorber les recherches
 * répétées d'un même titre, assez court pour qu'une nouvelle édition finisse par apparaître.
 */
const RESULTS_TTL_MS = 7 * DAY_MS;
/**
 * Une recherche vide n'est gardée qu'un jour : un livre tout juste paru peut ne pas encore
 * être indexé par Google, et on ne veut pas le déclarer introuvable pendant une semaine.
 */
const EMPTY_TTL_MS = DAY_MS;

/**
 * Clé de cache d'une recherche. Le texte libre est normalisé (casse, espaces, forme Unicode)
 * pour que « Dune », « dune » et « dune  » partagent la même entrée.
 */
export function searchCacheKey(search: { isbn: string } | { q: string }): string {
  if ("isbn" in search) return `isbn:${search.isbn}`;
  return `q:${search.q.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ")}`;
}

const entryColumns = {
  id: catalogBook.id,
  isbn: catalogBook.isbn,
  title: catalogBook.title,
  subtitle: catalogBook.subtitle,
  authors: catalogBook.authors,
  description: catalogBook.description,
  coverUrl: catalogBook.coverUrl,
  pageCount: catalogBook.pageCount,
  publishedDate: catalogBook.publishedDate,
  genres: catalogBook.genres,
};

/**
 * Résultats en cache d'une recherche, dans l'ordre d'origine, ou `null` si la recherche est
 * absente ou expirée et doit être relancée auprès de Google.
 */
export async function getCachedSearch(key: string): Promise<CatalogEntry[] | null> {
  const [cached] = await db
    .select({ bookIds: catalogSearch.bookIds })
    .from(catalogSearch)
    .where(and(eq(catalogSearch.query, key), gt(catalogSearch.expiresAt, new Date())));
  if (!cached) return null;
  if (cached.bookIds.length === 0) return [];

  const entries = await db
    .select(entryColumns)
    .from(catalogBook)
    .where(inArray(catalogBook.id, cached.bookIds));

  // Un livre manquant ne devrait pas arriver (le catalogue n'est jamais purgé) ; si c'est le
  // cas, on relance la recherche plutôt que de renvoyer une liste tronquée.
  if (entries.length !== cached.bookIds.length) return null;

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return cached.bookIds.map((id) => byId.get(id)!);
}

/**
 * Enregistre les résultats d'une recherche Google : les livres rejoignent (ou mettent à jour)
 * le catalogue, et la requête mémorise leur ordre. Dans une transaction, pour qu'une
 * recherche en cache ne puisse jamais pointer vers des livres absents du catalogue.
 */
export async function saveSearch(
  key: string,
  books: CatalogEntry[],
  { partial = false }: { partial?: boolean } = {},
): Promise<void> {
  // Google renvoie parfois deux fois le même volume dans une page de résultats, ce qu'un
  // ON CONFLICT DO UPDATE refuse au sein d'un même INSERT.
  const unique = [...new Map(books.map((entry) => [entry.id, entry])).values()];
  // Une recherche à laquelle une source n'a pas répondu n'est gardée qu'un jour, comme
  // une recherche vide : la suivante aura sa chance d'être complète.
  const ttl = unique.length > 0 && !partial ? RESULTS_TTL_MS : EMPTY_TTL_MS;

  await db.transaction(async (tx) => {
    if (unique.length > 0) {
      await tx
        .insert(catalogBook)
        .values(unique)
        .onConflictDoUpdate({
          target: catalogBook.id,
          set: {
            isbn: sql`excluded.isbn`,
            title: sql`excluded.title`,
            subtitle: sql`excluded.subtitle`,
            authors: sql`excluded.authors`,
            description: sql`excluded.description`,
            coverUrl: sql`excluded.cover_url`,
            pageCount: sql`excluded.page_count`,
            publishedDate: sql`excluded.published_date`,
            genres: sql`excluded.genres`,
            updatedAt: new Date(),
          },
        });
    }

    const row = {
      query: key,
      bookIds: unique.map((entry) => entry.id),
      expiresAt: new Date(Date.now() + ttl),
    };
    await tx
      .insert(catalogSearch)
      .values(row)
      .onConflictDoUpdate({
        target: catalogSearch.query,
        set: { bookIds: row.bookIds, expiresAt: row.expiresAt },
      });
  });
}

/** Supprime les recherches expirées. Le catalogue lui-même est conservé. */
export async function purgeExpiredSearches(): Promise<number> {
  const deleted = await db.delete(catalogSearch).where(lt(catalogSearch.expiresAt, new Date()));
  return deleted.rowCount ?? 0;
}
