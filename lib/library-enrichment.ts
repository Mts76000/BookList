import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { sameWork, searchBooks } from "@/lib/book-search";
import type { CatalogEntry } from "@/lib/book-catalog";
import { checkCover, firstValidCover } from "@/lib/cover-check";
import { logger } from "@/lib/logger";

/**
 * Complète les fiches de la bibliothèque auxquelles il manque une couverture, un nombre de
 * pages ou un résumé : livres importés d'un export Goodreads ou StoryGraph (qui n'ont ni
 * couverture ni résumé), saisis à la main, ou dont la couverture enregistrée ne répond plus.
 *
 * Chaque livre est vérifié une fois ; ceux auxquels il manque encore une couverture ou des
 * pages sont retentés un mois plus tard, le temps que les sources s'enrichissent.
 *
 * Règle : une valeur déjà présente n'est jamais écrasée, elle peut avoir été saisie par
 * l'utilisateur. Seule exception, une couverture enregistrée dont la source répond qu'elle
 * n'existe pas (ou plus) est remplacée, et uniquement par une couverture vérifiée.
 */

const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
/** Délai avant de retenter un livre que les sources n'ont pas pu traiter (quota, panne). */
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
/** Livres traités en parallèle : assez pour avancer, assez peu pour ménager les quotas. */
const CONCURRENCY = 3;

type LibraryBook = Pick<
  typeof book.$inferSelect,
  | "id"
  | "title"
  | "author"
  | "isbn"
  | "coverUrl"
  | "pageCount"
  | "description"
  | "publishedDate"
  | "genre"
>;

export interface EnrichmentResult {
  checked: number;
  updated: number;
}

export async function enrichLibrary({
  userId,
  limit = 20,
}: { userId?: string; limit?: number } = {}): Promise<EnrichmentResult> {
  const recheckBefore = new Date(Date.now() - RECHECK_AFTER_MS);
  const candidates = await db
    .select({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      coverUrl: book.coverUrl,
      pageCount: book.pageCount,
      description: book.description,
      publishedDate: book.publishedDate,
      genre: book.genre,
    })
    .from(book)
    .where(
      and(
        userId ? eq(book.userId, userId) : undefined,
        or(
          isNull(book.metadataCheckedAt),
          and(
            lt(book.metadataCheckedAt, recheckBefore),
            or(isNull(book.coverUrl), isNull(book.pageCount)),
          ),
        ),
      ),
    )
    .orderBy(sql`${book.metadataCheckedAt} asc nulls first`, asc(book.createdAt))
    .limit(limit);

  let updated = 0;
  for (let index = 0; index < candidates.length; index += CONCURRENCY) {
    const outcomes = await Promise.all(
      candidates.slice(index, index + CONCURRENCY).map((entry) =>
        enrichBook(entry).catch((err: unknown) => {
          logger.warn({ err, bookId: entry.id }, "Book enrichment failed");
          return false;
        }),
      ),
    );
    updated += outcomes.filter(Boolean).length;
  }
  return { checked: candidates.length, updated };
}

/** Complète un livre ; `true` si au moins un champ a été rempli. */
async function enrichBook(entry: LibraryBook): Promise<boolean> {
  const staleCover = entry.coverUrl && (await checkCover(entry.coverUrl)) === "invalid";
  const needsCover = !entry.coverUrl || staleCover;

  if (!needsCover && entry.pageCount && entry.description) {
    await markChecked(entry.id, new Date());
    return false;
  }

  const found = await findMatch(entry);
  if (found === "unavailable") {
    // Quota ou panne : on retentera demain plutôt que dans un mois, sans bloquer la file
    // pour les livres suivants.
    await markChecked(entry.id, new Date(Date.now() - RECHECK_AFTER_MS + RETRY_AFTER_MS));
    return false;
  }

  // Le catalogue partagé peut contenir des fiches antérieures à la vérification des
  // couvertures : on vérifie aussi celle-ci.
  const cover = needsCover && found ? await firstValidCover([found.coverUrl]) : null;
  const fields = {
    coverUrl: cover,
    pageCount: found?.pageCount ?? null,
    description: found?.description ?? null,
    publishedDate: found?.publishedDate ?? null,
    genre: found?.genres?.[0] ?? null,
  };
  const fills = Object.entries(fields).filter(
    ([key, value]) => value !== null && (key === "coverUrl" || !entry[key as keyof LibraryBook]),
  );

  await db
    .update(book)
    .set({
      // COALESCE côté base : une valeur saisie entre la lecture et l'écriture est gardée.
      coverUrl:
        staleCover && cover
          ? sql`case when ${book.coverUrl} = ${entry.coverUrl} then ${cover} else coalesce(${book.coverUrl}, ${cover}) end`
          : sql`coalesce(${book.coverUrl}, ${cover})`,
      pageCount: sql`coalesce(${book.pageCount}, ${fields.pageCount}::integer)`,
      description: sql`coalesce(${book.description}, ${fields.description})`,
      publishedDate: sql`coalesce(${book.publishedDate}, ${fields.publishedDate})`,
      genre: sql`coalesce(${book.genre}, ${fields.genre})`,
      metadataCheckedAt: new Date(),
      // Une fiche complétée n'est pas une activité de l'utilisateur : `updatedAt` ordonne
      // les lectures en cours du tableau de bord, il ne doit pas bouger.
      updatedAt: sql`${book.updatedAt}`,
    })
    .where(eq(book.id, entry.id));

  return fills.length > 0;
}

/**
 * La fiche du livre dans les sources : par ISBN, l'édition exacte ; sans ISBN, la même
 * œuvre retrouvée par titre et auteur (son nombre de pages est alors celui d'une autre
 * édition, le plus souvent proche).
 */
async function findMatch(entry: LibraryBook): Promise<CatalogEntry | null | "unavailable"> {
  if (entry.isbn) {
    const result = await searchBooks({ isbn: entry.isbn });
    if (result.unavailable) return "unavailable";
    return result.books[0] ?? null;
  }

  const result = await searchBooks({ q: `${entry.title} ${entry.author}` });
  if (result.unavailable) return "unavailable";
  const self = { title: entry.title, authors: [entry.author] } as CatalogEntry;
  return result.books.find((other) => sameWork(self, other)) ?? null;
}

async function markChecked(id: string, checkedAt: Date): Promise<void> {
  await db
    .update(book)
    .set({ metadataCheckedAt: checkedAt, updatedAt: sql`${book.updatedAt}` })
    .where(eq(book.id, id));
}
