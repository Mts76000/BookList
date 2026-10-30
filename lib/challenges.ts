import type { BookStatus } from "@/lib/book-status";
import { parseGenres } from "@/lib/genres";

/** Pages à partir desquelles un livre compte comme un « pavé ». */
export const LONG_BOOK_PAGES = 500;

export const CHALLENGE_KINDS = {
  books: { label: "Nombre de livres", unit: "livres", needsFilter: false },
  pages: { label: "Nombre de pages", unit: "pages", needsFilter: false },
  long_books: {
    label: `Pavés (${LONG_BOOK_PAGES} pages et plus)`,
    unit: "pavés",
    needsFilter: false,
  },
  genre: { label: "Livres d'un genre", unit: "livres", needsFilter: true },
  author: { label: "Livres d'un auteur", unit: "livres", needsFilter: true },
} as const;

export type ChallengeKind = keyof typeof CHALLENGE_KINDS;

export interface ChallengeBook {
  author: string;
  genre: string | null;
  pageCount: number | null;
  userRating: number | null;
  status: BookStatus;
  userEndDate: Date | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function finishedIn(books: ChallengeBook[], year: number): ChallengeBook[] {
  return books.filter(
    (entry) =>
      entry.status !== "ABANDONED" &&
      entry.userEndDate &&
      new Date(entry.userEndDate).getFullYear() === year,
  );
}

/**
 * Progression d'un défi personnel : calculée sur les livres terminés dans l'année du défi.
 * Genre et auteur se comparent sans casse ni accents (« Sci-fi » saisi une fois en minuscules
 * ne doit pas faire échouer le défi).
 */
export function challengeProgress(
  challenge: { kind: string; filter: string | null; year: number },
  books: ChallengeBook[],
): number {
  const finished = finishedIn(books, challenge.year);
  const filter = challenge.filter ? normalize(challenge.filter) : "";

  switch (challenge.kind as ChallengeKind) {
    case "books":
      return finished.length;
    case "pages":
      return finished.reduce((sum, entry) => sum + (entry.pageCount ?? 0), 0);
    case "long_books":
      return finished.filter((entry) => (entry.pageCount ?? 0) >= LONG_BOOK_PAGES).length;
    case "genre":
      return finished.filter((entry) =>
        parseGenres(entry.genre).some((g) => normalize(g) === filter),
      ).length;
    case "author":
      return finished.filter((entry) => normalize(entry.author).includes(filter)).length;
    default:
      return 0;
  }
}

export interface BadgeContext {
  books: ChallengeBook[];
  year: number;
  longestStreak: number;
  goal: number | null;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  earned: boolean;
}

const BADGES: {
  id: string;
  title: string;
  description: string;
  target: number;
  measure: (context: BadgeContext) => number;
}[] = [
  {
    id: "first",
    title: "Premier chapitre",
    description: "Terminer un premier livre",
    target: 1,
    measure: ({ books }) => books.filter((b) => b.status === "FINISHED").length,
  },
  {
    id: "year-12",
    title: "Un par mois",
    description: "Terminer 12 livres dans l'année",
    target: 12,
    measure: ({ books, year }) => finishedIn(books, year).length,
  },
  {
    id: "explorer",
    title: "Explorateur",
    description: "Lire 5 genres différents dans l'année",
    target: 5,
    measure: ({ books, year }) =>
      new Set(finishedIn(books, year).flatMap((b) => parseGenres(b.genre).map(normalize))).size,
  },
  {
    id: "long-books",
    title: "Amateur de pavés",
    description: `Terminer 3 livres de ${LONG_BOOK_PAGES} pages ou plus`,
    target: 3,
    measure: ({ books }) =>
      books.filter((b) => b.status === "FINISHED" && (b.pageCount ?? 0) >= LONG_BOOK_PAGES).length,
  },
  {
    id: "loyal",
    title: "Fidèle",
    description: "Lire 3 livres du même auteur",
    target: 3,
    measure: ({ books }) => {
      const counts = new Map<string, number>();
      for (const b of books.filter((entry) => entry.status === "FINISHED")) {
        counts.set(b.author, (counts.get(b.author) ?? 0) + 1);
      }
      return Math.max(0, ...counts.values());
    },
  },
  {
    id: "streak-7",
    title: "Régulier",
    description: "Lire 7 jours d'affilée",
    target: 7,
    measure: ({ longestStreak }) => longestStreak,
  },
  {
    id: "streak-30",
    title: "Assidu",
    description: "Lire 30 jours d'affilée",
    target: 30,
    measure: ({ longestStreak }) => longestStreak,
  },
  {
    id: "critic",
    title: "Critique",
    description: "Noter 20 livres",
    target: 20,
    measure: ({ books }) => books.filter((b) => b.userRating).length,
  },
  {
    id: "marathon",
    title: "Marathonien",
    description: "Tourner 10 000 pages",
    target: 10_000,
    measure: ({ books }) =>
      books.filter((b) => b.status === "FINISHED").reduce((sum, b) => sum + (b.pageCount ?? 0), 0),
  },
  {
    id: "centenary",
    title: "Centenaire",
    description: "Terminer 100 livres",
    target: 100,
    measure: ({ books }) => books.filter((b) => b.status === "FINISHED").length,
  },
];

/** Badges de base, ouverts à tous, avec leur progression. */
export function computeBadges(context: BadgeContext): Badge[] {
  const badges = BADGES.map(({ measure, ...badge }) => {
    const progress = measure(context);
    return {
      ...badge,
      progress: Math.min(progress, badge.target),
      earned: progress >= badge.target,
    };
  });

  // Badge de l'objectif annuel, seulement quand un objectif est fixé.
  if (context.goal !== null) {
    const progress = finishedIn(context.books, context.year).length;
    badges.push({
      id: "goal",
      title: `Objectif ${context.year}`,
      description: `Atteindre son objectif de ${context.goal} livres`,
      target: context.goal,
      progress: Math.min(progress, context.goal),
      earned: progress >= context.goal,
    });
  }
  return badges;
}
