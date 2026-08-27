import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, comment } from "@/drizzle/schema";
import { countGenres } from "@/lib/genres";

export interface ReadingStats {
  /** Livres en bibliothèque, augmentés de ceux lus avant l'inscription. */
  totalBooks: number;
  totalPagesRead: number;
  /** Moyenne des notes attribuées, 0 si aucun livre n'est noté. */
  averageRating: number;
  booksThisYear: number;
  commentsCount: number;
  topAuthors: { author: string; count: number }[];
  topGenres: string[];
  /** Pages lues par année d'achèvement, de la plus récente à la plus ancienne. */
  pagesPerYear: { year: number; pages: number }[];
}

/**
 * Statistiques de lecture d'un utilisateur, partagées par le tableau de bord et la page
 * du compte.
 *
 * Un seul SELECT sur les livres, puis agrégation en mémoire, plutôt qu'une dizaine
 * d'agrégats SQL séparés : une bibliothèque personnelle se compte en centaines de lignes,
 * et le code reste lisible d'un bloc au lieu d'être éclaté en requêtes qu'il faut ensuite
 * garder cohérentes entre elles.
 */
export async function getReadingStats(
  userId: string,
  initialBooksRead: number,
): Promise<ReadingStats> {
  const [books, [{ value: commentsCount }]] = await Promise.all([
    db
      .select({
        author: book.author,
        genre: book.genre,
        pageCount: book.pageCount,
        userRating: book.userRating,
        userEndDate: book.userEndDate,
      })
      .from(book)
      .where(eq(book.userId, userId)),
    db.select({ value: count() }).from(comment).where(eq(comment.userId, userId)),
  ]);

  const currentYear = new Date().getFullYear();
  const pagesByYear = new Map<number, number>();
  const booksByAuthor = new Map<string, number>();

  let totalPagesRead = 0;
  let ratingSum = 0;
  let ratedBooks = 0;
  let booksThisYear = 0;

  for (const entry of books) {
    if (entry.pageCount) totalPagesRead += entry.pageCount;
    if (entry.userRating) {
      ratingSum += entry.userRating;
      ratedBooks += 1;
    }
    booksByAuthor.set(entry.author, (booksByAuthor.get(entry.author) ?? 0) + 1);

    if (entry.userEndDate) {
      const year = new Date(entry.userEndDate).getFullYear();
      if (year === currentYear) booksThisYear += 1;
      if (entry.pageCount) {
        pagesByYear.set(year, (pagesByYear.get(year) ?? 0) + entry.pageCount);
      }
    }
  }

  const topAuthors = [...booksByAuthor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([author, bookCount]) => ({ author, count: bookCount }));

  const topGenres = [...countGenres(books).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);

  return {
    totalBooks: books.length + initialBooksRead,
    totalPagesRead,
    averageRating: ratedBooks > 0 ? ratingSum / ratedBooks : 0,
    booksThisYear,
    commentsCount,
    topAuthors,
    topGenres,
    pagesPerYear: [...pagesByYear.entries()]
      .sort(([a], [b]) => b - a)
      .map(([year, pages]) => ({ year, pages })),
  };
}
