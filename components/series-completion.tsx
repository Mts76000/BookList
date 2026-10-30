"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { normalizeText } from "@/lib/series-detection";

interface MissingVolume {
  id: string;
  title: string;
  index: number | null;
  year: number | null;
}

type Completion =
  | { found: false }
  | { found: true; total: number; missingCount: number; missing: MissingVolume[]; author: string };

interface SearchResult {
  title: string;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedDate: string | null;
  isbn: string | null;
  genres: string[] | null;
}

/**
 * Tomes manquants d'une saga, d'après Wikidata, sous la carte de la saga. Chargés après
 * l'affichage de la page : la première consultation d'une saga peut prendre quelques
 * secondes, les suivantes viennent du cache partagé.
 *
 * Premium les ajoute à sa pile en un clic, avec couverture et ISBN cherchés seulement à ce
 * moment-là ; un compte gratuit voit combien il en manque.
 */
export function SeriesCompletion({ name, isPremium }: { name: string; isPremium: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [adding, setAdding] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void apiFetch<Completion>(`/api/series/missing?${new URLSearchParams({ name })}`).then(
      (result) => {
        if (!cancelled && result.ok) setCompletion(result.data);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!completion?.found || completion.total === 0) return null;
  const { total, missingCount, missing, author } = completion;

  if (missingCount === 0) {
    return <p className="mt-2 text-xs text-stone-500">Vous avez tous les tomes parus ({total}).</p>;
  }

  if (!isPremium) {
    return (
      <p className="mt-3 text-sm text-stone-600">
        La saga compte {total} tomes, il vous en manque {missingCount}.{" "}
        <Link href="/account#premium" className="text-accent-700 font-medium hover:underline">
          Les ajouter avec Premium
        </Link>
      </p>
    );
  }

  /** Ajoute un tome à la pile, avec couverture et ISBN si la recherche les trouve. */
  async function addVolume(volume: MissingVolume): Promise<boolean> {
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
        seriesName: name,
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
    if (!result.ok) toast(result.message, "error");
    return result.ok;
  }

  async function add(volumes: MissingVolume[]) {
    setAdding(new Set(volumes.map((volume) => volume.id)));
    const added: string[] = [];
    // L'un après l'autre : les recherches et ajouts sont limités en débit.
    for (const volume of volumes) {
      if (await addVolume(volume)) added.push(volume.id);
      else break;
    }
    setAdding(new Set());
    // Les tomes ajoutés quittent la liste tout de suite, sans attendre un nouvel appel.
    setCompletion((current) =>
      current?.found
        ? {
            ...current,
            missing: current.missing.filter((volume) => !added.includes(volume.id)),
            missingCount: current.missingCount - added.length,
          }
        : current,
    );
    if (added.length > 0) {
      toast(
        added.length === 1
          ? "Tome ajouté à votre pile."
          : `${added.length} tomes ajoutés à votre pile.`,
        "success",
      );
      router.refresh();
    }
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-stone-700">
          Il vous manque {missingCount} tome{missingCount > 1 ? "s" : ""} sur {total}
        </p>
        {missing.length > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => add(missing)}
            isLoading={adding.size > 1}
            disabled={adding.size > 0}
            className="px-3 py-2 text-sm"
          >
            Tout ajouter à ma pile
          </Button>
        )}
      </div>
      <ul className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6">
        {missing.map((volume) => (
          <li key={volume.id} className="w-[5.5rem] shrink-0 sm:w-24">
            <div className="rounded-[var(--radius-sm)] border border-dashed border-stone-300 p-1">
              <BookCover
                alt={volume.title}
                author={author}
                className="aspect-[2/3] w-full rounded-[4px] opacity-60"
              />
            </div>
            <p className="mt-2 text-xs font-medium text-stone-700">Tome {volume.index}</p>
            <p className="line-clamp-2 text-xs text-stone-500" title={volume.title}>
              {volume.title}
            </p>
            <button
              type="button"
              onClick={() => add([volume])}
              disabled={adding.size > 0}
              className="text-accent-700 mt-1 flex min-h-8 items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
            >
              <Plus size={12} aria-hidden="true" />
              {adding.has(volume.id) ? "Ajout…" : "Ajouter"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
