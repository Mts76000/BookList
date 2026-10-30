import { apiFetch } from "@/lib/api-client";
import { normalizeText } from "@/lib/series-detection";

/** Un tome de saga à ajouter à la pile, tel que Wikidata le décrit. */
export interface VolumeToAdd {
  title: string;
  index: number | null;
  year: number | null;
}

interface SearchResult {
  title: string;
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedDate: string | null;
  isbn: string | null;
  genres: string[] | null;
}

/**
 * Ajoute un tome manquant à la pile à lire, rangé dans sa saga. Couverture, ISBN et résumé
 * sont cherchés à ce moment-là seulement (catalogue partagé, puis Google Books) ; sans
 * résultat, le livre est créé quand même, avec une couverture générée.
 */
export async function addSeriesVolume({
  volume,
  author,
  seriesName,
  total,
}: {
  volume: VolumeToAdd;
  author: string;
  seriesName: string;
  total: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const search = await apiFetch<{ books: SearchResult[] }>(
    `/api/books/search?${new URLSearchParams({ q: `${volume.title} ${author}` })}`,
  );
  const wanted = normalizeText(volume.title);
  const match = search.ok
    ? search.data.books.find((entry) => {
        const title = normalizeText(entry.title);
        return title === wanted || title.includes(wanted) || wanted.includes(title);
      })
    : undefined;

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
