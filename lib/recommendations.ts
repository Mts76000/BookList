import type { BookStatus } from "@/lib/book-status";
import { parseGenres } from "@/lib/genres";

export interface RecommendableBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  genre: string | null;
  status: BookStatus;
  userRating: number | null;
  seriesName: string | null;
  seriesIndex: number | null;
}

export interface Recommendation {
  book: RecommendableBook;
  /** Raison principale, en une phrase, affichée sous le livre. */
  reason: string;
  score: number;
}

/** Note neutre : une moyenne au-dessus attire, en dessous éloigne. */
const NEUTRAL_RATING = 3;

function averageBy(
  books: RecommendableBook[],
  keysOf: (entry: RecommendableBook) => string[],
): Map<string, { average: number; count: number }> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const entry of books) {
    for (const key of keysOf(entry)) {
      const current = sums.get(key) ?? { total: 0, count: 0 };
      sums.set(key, { total: current.total + entry.userRating!, count: current.count + 1 });
    }
  }
  return new Map(
    [...sums].map(([key, { total, count }]) => [key, { average: total / count, count }]),
  );
}

function formatRating(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/**
 * Livres de la pile à lire qui correspondent le mieux aux goûts de l'utilisateur, déduits de
 * ses notes : auteurs et genres qu'il note au-dessus de la moyenne, et suites de sagas dont
 * il a terminé le tome précédent. Rien n'est recommandé sans signal : une pile sans lien
 * avec les lectures notées ne renvoie rien, plutôt qu'un classement arbitraire.
 */
export function recommendNext(books: RecommendableBook[], limit = 3): Recommendation[] {
  const rated = books.filter((entry) => entry.status === "FINISHED" && entry.userRating);
  const byAuthor = averageBy(rated, (entry) => [entry.author]);
  const byGenre = averageBy(rated, (entry) => parseGenres(entry.genre));

  const finishedVolumes = new Set(
    books
      .filter((entry) => entry.status === "FINISHED" && entry.seriesName && entry.seriesIndex)
      .map((entry) => `${entry.seriesName!.toLowerCase()}#${entry.seriesIndex}`),
  );

  const recommendations: Recommendation[] = [];
  for (const entry of books) {
    if (entry.status !== "TO_READ") continue;

    const signals: { score: number; reason: string }[] = [];

    if (
      entry.seriesName &&
      entry.seriesIndex &&
      finishedVolumes.has(`${entry.seriesName.toLowerCase()}#${entry.seriesIndex - 1}`)
    ) {
      signals.push({
        score: 3,
        reason: `La suite de ${entry.seriesName} : vous avez terminé le tome ${entry.seriesIndex - 1}.`,
      });
    }

    const author = byAuthor.get(entry.author);
    if (author && author.average > NEUTRAL_RATING) {
      signals.push({
        score: (author.average - NEUTRAL_RATING) * 1.5,
        reason: `Vous notez ${entry.author} ${formatRating(author.average)}/5 en moyenne.`,
      });
    }

    const [bestGenre] = parseGenres(entry.genre)
      .map((genre) => ({ genre, stats: byGenre.get(genre) }))
      .filter((match) => match.stats && match.stats.average > NEUTRAL_RATING)
      .sort((a, b) => b.stats!.average - a.stats!.average);
    if (bestGenre) {
      signals.push({
        score: bestGenre.stats!.average - NEUTRAL_RATING,
        reason: `${bestGenre.genre} : vous notez ce genre ${formatRating(bestGenre.stats!.average)}/5 en moyenne.`,
      });
    }

    if (signals.length === 0) continue;
    const [strongest] = [...signals].sort((a, b) => b.score - a.score);
    recommendations.push({
      book: entry,
      reason: strongest.reason,
      score: signals.reduce((sum, signal) => sum + signal.score, 0),
    });
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
}
