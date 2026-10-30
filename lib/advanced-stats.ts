import type { BookStatus } from "@/lib/book-status";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, readingActivity } from "@/drizzle/schema";
import { countGenres } from "@/lib/genres";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StatsBook {
  author: string;
  genre: string | null;
  pageCount: number | null;
  userRating: number | null;
  status: BookStatus;
  userStartDate: Date | null;
  userEndDate: Date | null;
}

export interface StatsActivity {
  /** `YYYY-MM-DD`. */
  date: string;
  pagesRead: number;
}

export interface AdvancedStats {
  year: number;
  /** Livres terminés et pages de ces livres, pour chacun des 12 mois de l'année. */
  months: { month: number; books: number; pages: number }[];
  genres: { genre: string; count: number }[];
  /** Nombre de livres par note, de 1 à 5. */
  ratings: number[];
  currentStreak: number;
  longestStreak: number;
  jokersUsedThisMonth: number;
  /** Durée moyenne entre début et fin d'un livre, en jours. */
  averageDaysPerBook: number | null;
  averagePages: number | null;
  byStatus: { toRead: number; reading: number; finished: number; abandoned: number };
  /**
   * Mois nécessaires pour vider la pile à lire au rythme des 12 derniers mois. `null` sans
   * pile ou sans lecture terminée sur la période.
   */
  backlogMonths: number | null;
  topAuthors: { author: string; count: number }[];
}

/** Jour civil `YYYY-MM-DD` d'une date, en UTC comme les dates du graphe d'activité. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Mois civil `YYYY-MM` d'un jour `YYYY-MM-DD`. */
function monthOf(day: string): string {
  return day.slice(0, 7);
}

export interface Streaks {
  current: number;
  longest: number;
  /** Jokers consommés pour protéger la série en cours, dans le mois courant. */
  jokersUsedThisMonth: number;
}

/**
 * Séries de jours consécutifs avec au moins une page lue. La série en cours compte encore
 * si le dernier jour lu est hier : la journée n'est pas finie, elle n'est pas rompue.
 *
 * `jokersPerMonth` (Premium) : autant de jours manqués par mois civil peuvent être couverts
 * sans rompre la série en cours. Un jour couvert par un joker ne compte pas comme jour lu,
 * il évite seulement la rupture.
 */
export function readingStreaks(
  activities: StatsActivity[],
  today = new Date(),
  jokersPerMonth = 0,
): Streaks {
  const days = new Set(activities.filter((a) => a.pagesRead > 0).map((a) => a.date));
  if (days.size === 0) return { current: 0, longest: 0, jokersUsedThisMonth: 0 };

  const sorted = [...days].sort();
  const earliest = sorted[0];
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = (Date.parse(sorted[i]) - Date.parse(sorted[i - 1])) / DAY_MS;
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const jokersUsed = new Map<string, number>();
  let current = 0;
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (dayKey(cursor) >= earliest) {
    const key = dayKey(cursor);
    if (days.has(key)) {
      current += 1;
    } else {
      const used = jokersUsed.get(monthOf(key)) ?? 0;
      if (used >= jokersPerMonth) break;
      jokersUsed.set(monthOf(key), used + 1);
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    current,
    longest: Math.max(longest, current),
    jokersUsedThisMonth: jokersUsed.get(monthOf(dayKey(today))) ?? 0,
  };
}

/** Statistiques détaillées (Premium). Fonction pure, testée isolément. */
export function computeAdvancedStats(
  books: StatsBook[],
  activities: StatsActivity[],
  year: number,
  today = new Date(),
  jokersPerMonth = 0,
): AdvancedStats {
  const months = Array.from({ length: 12 }, (_, month) => ({ month, books: 0, pages: 0 }));
  const ratings = [0, 0, 0, 0, 0];
  const byAuthor = new Map<string, number>();
  const durations: number[] = [];
  const lengths: number[] = [];
  const byStatus = { toRead: 0, reading: 0, finished: 0, abandoned: 0 };
  const yearAgo = today.getTime() - 365 * DAY_MS;
  let finishedLastYear = 0;

  for (const entry of books) {
    if (entry.status === "TO_READ") byStatus.toRead += 1;
    else if (entry.status === "READING") byStatus.reading += 1;
    else if (entry.status === "ABANDONED") byStatus.abandoned += 1;
    else byStatus.finished += 1;

    // Une demi-étoile compte avec l'étoile pleine au-dessus : 4,5 rejoint les 5.
    if (entry.userRating && entry.userRating > 0 && entry.userRating <= 5) {
      ratings[Math.ceil(entry.userRating) - 1] += 1;
    }
    byAuthor.set(entry.author, (byAuthor.get(entry.author) ?? 0) + 1);

    // Un livre abandonné peut porter sa date d'arrêt : il ne compte pas comme lu.
    if (!entry.userEndDate || entry.status === "ABANDONED") continue;
    const end = new Date(entry.userEndDate);
    if (end.getTime() >= yearAgo && end.getTime() <= today.getTime()) finishedLastYear += 1;
    if (entry.pageCount) lengths.push(entry.pageCount);

    if (end.getFullYear() === year) {
      months[end.getMonth()].books += 1;
      months[end.getMonth()].pages += entry.pageCount ?? 0;
    }

    if (entry.userStartDate) {
      const days = Math.round((end.getTime() - new Date(entry.userStartDate).getTime()) / DAY_MS);
      // Une date de début postérieure à la fin est une erreur de saisie : on l'ignore.
      if (days >= 0) durations.push(Math.max(days, 1));
    }
  }

  const average = (values: number[]) =>
    values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

  const perMonth = finishedLastYear / 12;
  const streaks = readingStreaks(activities, today, jokersPerMonth);

  return {
    year,
    months,
    genres: [...countGenres(books).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([genre, count]) => ({ genre, count })),
    ratings,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    jokersUsedThisMonth: streaks.jokersUsedThisMonth,
    averageDaysPerBook: average(durations),
    averagePages: average(lengths),
    byStatus,
    backlogMonths:
      byStatus.toRead > 0 && perMonth > 0 ? Math.ceil(byStatus.toRead / perMonth) : null,
    topAuthors: [...byAuthor.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author, count]) => ({ author, count })),
  };
}

export async function getAdvancedStats(
  userId: string,
  year: number,
  jokersPerMonth = 0,
): Promise<AdvancedStats> {
  const [books, activities] = await Promise.all([
    db
      .select({
        author: book.author,
        genre: book.genre,
        pageCount: book.pageCount,
        userRating: book.userRating,
        status: book.status,
        userStartDate: book.userStartDate,
        userEndDate: book.userEndDate,
      })
      .from(book)
      .where(eq(book.userId, userId)),
    db
      .select({ date: readingActivity.date, pagesRead: readingActivity.pagesRead })
      .from(readingActivity)
      .where(eq(readingActivity.userId, userId)),
  ]);
  return computeAdvancedStats(books, activities, year, new Date(), jokersPerMonth);
}
