import { apiFetch } from "@/lib/api-client";
import { titleMatches } from "@/lib/edition-match";
import type { Edition } from "@/lib/series-editions";

/** Un tome de saga à ajouter à la pile, tel que Wikidata le décrit. */
export interface VolumeToAdd {
  title: string;
  index: number | null;
  year: number | null;
}

type SearchResult = Edition & { title: string };

/** Édition trouvée par la recherche de livres, quand aucune n'a été choisie à l'avance. */
async function searchEdition(title: string, author: string): Promise<Edition | null> {
  const search = await apiFetch<{ books: SearchResult[] }>(
    `/api/books/search?${new URLSearchParams({ q: `${title} ${author}` })}`,
  );
  if (!search.ok) return null;
  return search.data.books.find((entry) => titleMatches(entry.title, title)) ?? null;
}

/**
 * Ajoute un tome manquant à la pile à lire, rangé dans sa saga. L'édition déjà choisie
 * (`edition`, voir /api/series/editions) est reprise telle quelle ; sinon couverture, ISBN et
 * résumé sont cherchés à ce moment-là. Sans résultat, le livre est créé quand même, avec
 * une couverture générée.
 */
export async function addSeriesVolume({
  volume,
  author,
  seriesName,
  total,
  edition,
}: {
  volume: VolumeToAdd;
  author: string;
  seriesName: string;
  total: number;
  edition?: Edition | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const match = edition !== undefined ? edition : await searchEdition(volume.title, author);

  const result = await apiFetch("/api/books", {
    method: "POST",
    json: {
      title: volume.title,
      author,
      status: "TO_READ",
      seriesName,
      seriesIndex: volume.index,
      seriesTotal: total,
      publishedDate: match?.publishedDate ?? volume.year?.toString() ?? null,
      coverUrl: match?.coverUrl ?? null,
      isbn: match?.isbn ?? null,
      description: match?.description ?? null,
      pageCount: match?.pageCount ?? null,
      genre: match?.genres?.join(", ") ?? null,
    },
  });
  return result.ok ? { ok: true } : { ok: false, message: result.message };
}
