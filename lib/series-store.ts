import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";

type Executor = Pick<typeof db, "select">;

/** Condition « ce livre appartient à la saga `name` », sans tenir compte de la casse ni des
 *  espaces autour, comme le regroupement de la page Sagas. */
export function inSeries(userId: string, name: string) {
  return and(eq(book.userId, userId), sql`lower(trim(${book.seriesName})) = lower(trim(${name}))`);
}

/**
 * Orthographe déjà utilisée pour cette saga dans la bibliothèque, sinon le nom tel quel :
 * « dune » saisi à côté d'une saga « Dune » rejoint « Dune » au lieu d'en créer une seconde.
 */
export async function canonicalSeriesName(
  executor: Executor,
  userId: string,
  name: string,
): Promise<string> {
  const trimmed = name.trim();
  const [existing] = await executor
    .select({ seriesName: book.seriesName })
    .from(book)
    .where(and(inSeries(userId, trimmed), isNotNull(book.seriesName)))
    .limit(1);
  return existing?.seriesName?.trim() ?? trimmed;
}

export interface KnownSeries {
  name: string;
  /** Tome suivant le dernier de la bibliothèque, proposé pour un nouveau livre. */
  nextIndex: number;
  total: number | null;
  /** Auteurs de ses tomes, pour rattacher un nouveau livre du même auteur. */
  authors: string[];
}

/** Sagas de la bibliothèque, pour les proposer à la saisie et préremplir le tome suivant. */
export async function getKnownSeries(userId: string): Promise<KnownSeries[]> {
  const rows = await db
    .select({
      name: sql<string>`min(trim(${book.seriesName}))`,
      lastIndex: sql<number | null>`max(${book.seriesIndex})`,
      total: sql<number | null>`max(${book.seriesTotal})`,
      authors: sql<string[]>`array_agg(distinct ${book.author})`,
    })
    .from(book)
    .where(and(eq(book.userId, userId), isNotNull(book.seriesName)))
    .groupBy(sql`lower(trim(${book.seriesName}))`)
    .orderBy(sql`min(trim(${book.seriesName}))`);
  return rows.map((row) => ({
    name: row.name,
    nextIndex: (row.lastIndex ?? 0) + 1,
    total: row.total,
    authors: row.authors,
  }));
}
