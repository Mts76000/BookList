import { and, eq, isNotNull, ne } from "drizzle-orm";
import type { BookStatus } from "@/lib/book-status";
import { db } from "@/lib/db";
import { book, readingGoal, yearFavorite } from "@/drizzle/schema";
import { countGenres } from "@/lib/genres";

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export interface ReviewBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  pageCount: number | null;
  genre: string | null;
  userRating: number | null;
  userEndDate: Date | null;
  status: BookStatus;
}

export interface YearReview {
  year: number;
  booksCount: number;
  pagesCount: number;
  /** Objectif fixé pour l'année, `null` sans objectif. */
  goal: number | null;
  topGenre: string | null;
  topAuthor: { name: string; count: number } | null;
  /**
   * Coup de cœur choisi par l'utilisateur ; à défaut, le mieux noté, puis le plus récemment
   * terminé à note égale.
   */
  favoriteBook: ReviewBook | null;
  /** Vrai si le coup de cœur a été choisi, faux s'il est automatique. */
  favoriteChosen: boolean;
  /** Livres terminés dans l'année, du plus récent au plus ancien : candidats au coup de cœur. */
  finishedBooks: ReviewBook[];
  longestBook: ReviewBook | null;
  /** Mois le plus chargé, en toutes lettres. `null` si aucun mois ne se détache. */
  busiestMonth: { name: string; count: number } | null;
  averageRating: number | null;
}

/**
 * Bilan d'une année à partir des livres terminés cette année-là (même règle que
 * « Cette année » sur le tableau de bord : un livre compte l'année de sa date de fin).
 * Fonction pure, séparée de la lecture en base pour être testée isolément.
 */
export function summarizeYear(
  books: ReviewBook[],
  year: number,
  goal: number | null,
  chosenFavoriteId: string | null = null,
): YearReview {
  // Un livre abandonné peut porter sa date d'arrêt : il ne fait pas partie des lectures.
  const finished = books.filter(
    (entry) =>
      entry.status !== "ABANDONED" &&
      entry.userEndDate &&
      new Date(entry.userEndDate).getFullYear() === year,
  );

  const byAuthor = new Map<string, number>();
  const byMonth = new Array<number>(12).fill(0);
  let pagesCount = 0;
  let ratingSum = 0;
  let rated = 0;

  for (const entry of finished) {
    pagesCount += entry.pageCount ?? 0;
    byAuthor.set(entry.author, (byAuthor.get(entry.author) ?? 0) + 1);
    byMonth[new Date(entry.userEndDate!).getMonth()] += 1;
    if (entry.userRating) {
      ratingSum += entry.userRating;
      rated += 1;
    }
  }

  const [topAuthorEntry] = [...byAuthor.entries()].sort((a, b) => b[1] - a[1]);
  const [topGenreEntry] = [...countGenres(finished).entries()].sort((a, b) => b[1] - a[1]);

  // Un choix qui ne figure plus parmi les lectures de l'année (date de fin modifiée depuis)
  // est ignoré au profit du choix automatique.
  const chosen = chosenFavoriteId
    ? (finished.find((entry) => entry.id === chosenFavoriteId) ?? null)
    : null;

  const automaticFavorite =
    [...finished]
      .filter((entry) => entry.userRating)
      .sort(
        (a, b) =>
          b.userRating! - a.userRating! ||
          new Date(b.userEndDate!).getTime() - new Date(a.userEndDate!).getTime(),
      )[0] ?? null;

  const longestBook =
    [...finished]
      .filter((entry) => entry.pageCount)
      .sort((a, b) => b.pageCount! - a.pageCount!)[0] ?? null;

  const busiest = Math.max(...byMonth);
  const busiestIndex = byMonth.indexOf(busiest);

  return {
    year,
    booksCount: finished.length,
    pagesCount,
    goal,
    topGenre: topGenreEntry?.[0] ?? null,
    // Un auteur « le plus lu » avec un seul livre ne dit rien : il faut au moins deux livres.
    topAuthor:
      topAuthorEntry && topAuthorEntry[1] > 1
        ? { name: topAuthorEntry[0], count: topAuthorEntry[1] }
        : null,
    favoriteBook: chosen ?? automaticFavorite,
    favoriteChosen: chosen !== null,
    finishedBooks: [...finished].sort(
      (a, b) => new Date(b.userEndDate!).getTime() - new Date(a.userEndDate!).getTime(),
    ),
    longestBook,
    busiestMonth: busiest > 1 ? { name: MONTHS[busiestIndex], count: busiest } : null,
    averageRating: rated > 0 ? Math.round((ratingSum / rated) * 10) / 10 : null,
  };
}

/** Bilan d'une année pour un utilisateur, lu en base. */
export async function getYearReview(userId: string, year: number): Promise<YearReview> {
  const [books, goal, favorite] = await Promise.all([
    db
      .select({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        pageCount: book.pageCount,
        genre: book.genre,
        userRating: book.userRating,
        userEndDate: book.userEndDate,
        status: book.status,
      })
      .from(book)
      .where(and(eq(book.userId, userId), isNotNull(book.userEndDate))),
    db.query.readingGoal.findFirst({
      where: and(eq(readingGoal.userId, userId), eq(readingGoal.year, year)),
      columns: { target: true },
    }),
    db.query.yearFavorite.findFirst({
      where: and(eq(yearFavorite.userId, userId), eq(yearFavorite.year, year)),
      columns: { bookId: true },
    }),
  ]);
  return summarizeYear(books, year, goal?.target ?? null, favorite?.bookId ?? null);
}

/** Années pour lesquelles l'utilisateur a au moins un livre terminé, de la plus récente. */
export async function getReviewYears(userId: string): Promise<number[]> {
  const rows = await db
    .select({ userEndDate: book.userEndDate })
    .from(book)
    .where(and(eq(book.userId, userId), isNotNull(book.userEndDate), ne(book.status, "ABANDONED")));
  const years = new Set(rows.map((row) => new Date(row.userEndDate!).getFullYear()));
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
}
