// Le genre d'un livre est stocké comme une chaîne de valeurs séparées par des
// virgules (ex: "Roman, Philosophie"). Ce module centralise le parsing pour
// éviter de dupliquer la même logique split/trim/filter dans chaque page qui
// affiche des statistiques ou des filtres de genre.

export function parseGenres(genre: string | null | undefined): string[] {
  if (!genre) return [];
  return genre
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

export function countGenres(books: { genre: string | null }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const book of books) {
    for (const genre of parseGenres(book.genre)) {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    }
  }
  return counts;
}

export function topGenres(books: { genre: string | null }[], limit: number): string[] {
  return Array.from(countGenres(books).entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
}

export function uniqueGenres(books: { genre: string | null }[]): string[] {
  const set = new Set<string>();
  for (const book of books) {
    for (const genre of parseGenres(book.genre)) set.add(genre);
  }
  return Array.from(set).sort();
}
