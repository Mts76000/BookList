import type { BookStatus } from "@/lib/book-status";
export interface SeriesBook {
  id: string;
  title: string;
  /** Pour la couverture de remplacement, quand le tome n'a pas d'image. */
  author?: string;
  coverUrl: string | null;
  status: BookStatus;
  seriesName: string | null;
  seriesIndex: number | null;
  seriesTotal: number | null;
}

export interface Series {
  name: string;
  books: SeriesBook[];
  /** Nombre de tomes connu (le plus grand renseigné), `null` si inconnu. */
  total: number | null;
  finished: number;
  /**
   * Prochain tome à lire : le premier tome de la bibliothèque non terminé, par ordre de
   * tome. S'il manque à la bibliothèque, seul son numéro est connu (`book` vaut `null`).
   */
  next: { index: number | null; book: SeriesBook | null } | null;
}

/**
 * Regroupe les livres par saga (nom comparé sans casse) et calcule l'avancement de chacune.
 * Les sagas en cours passent devant les terminées.
 */
export function groupSeries(books: SeriesBook[]): Series[] {
  const groups = new Map<string, SeriesBook[]>();
  for (const entry of books) {
    if (!entry.seriesName) continue;
    const key = entry.seriesName.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const series = [...groups.values()].map((group): Series => {
    const sorted = [...group].sort(
      (a, b) => (a.seriesIndex ?? Infinity) - (b.seriesIndex ?? Infinity),
    );
    const totals = group.map((entry) => entry.seriesTotal ?? 0);
    const total = Math.max(...totals) || null;
    const finished = group.filter((entry) => entry.status === "FINISHED").length;

    const firstUnread = sorted.find((entry) => entry.status !== "FINISHED") ?? null;
    let next: Series["next"] = firstUnread
      ? { index: firstUnread.seriesIndex, book: firstUnread }
      : null;

    // Tout est lu : le tome suivant manque peut-être à la bibliothèque.
    if (!next) {
      const lastIndex = Math.max(...group.map((entry) => entry.seriesIndex ?? 0));
      if (lastIndex > 0 && (total === null || lastIndex < total)) {
        next = { index: lastIndex + 1, book: null };
      }
    }

    return { name: sorted[0].seriesName!.trim(), books: sorted, total, finished, next };
  });

  return series.sort(
    (a, b) => Number(a.next === null) - Number(b.next === null) || a.name.localeCompare(b.name),
  );
}

/**
 * Saga déduite d'un titre au format Goodreads : « Le Fléau (La Tour sombre, #4) ». Renvoie
 * `null` si le titre ne suit pas ce format.
 */
export function parseSeriesFromTitle(
  title: string,
): { title: string; seriesName: string; seriesIndex: number | null } | null {
  const match = title.match(/^(.*?)\s*\(([^()]+?),?\s*#(\d+(?:\.\d+)?)\)\s*$/);
  if (!match) return null;
  const [, bookTitle, seriesName, index] = match;
  const parsed = Number.parseFloat(index);
  return {
    title: bookTitle.trim() || title,
    seriesName: seriesName.trim(),
    seriesIndex: Number.isInteger(parsed) ? parsed : null,
  };
}
