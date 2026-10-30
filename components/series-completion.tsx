"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockSimple, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MissingVolumeCover, SeriesSearchPlaceholder } from "@/components/missing-volume-cover";
import { apiFetch } from "@/lib/api-client";
import { addSeriesVolume } from "@/lib/add-series-volume";
import { useSeriesEditions } from "@/lib/use-series-editions";

interface MissingVolume {
  id: string;
  title: string;
  index: number | null;
  year: number | null;
}

type Completion =
  | { found: false }
  | {
      found: true;
      total: number;
      missingCount: number;
      missing: MissingVolume[];
      author: string;
      referenceBookIds: string[];
    };

/**
 * Tomes manquants d'une saga, d'après Wikidata, sous la carte de la saga. Chargés après
 * l'affichage de la page, avec une attente visible : la première consultation d'une saga
 * prend quelques secondes, les suivantes viennent du cache partagé.
 *
 * Tout le monde voit quels tomes manquent, avec leur couverture dans la collection de ses
 * tomes. Premium les ajoute à sa pile en un clic ; un compte gratuit voit un lien vers
 * l'offre à la place du bouton d'ajout.
 */
export function SeriesCompletion({ name, isPremium }: { name: string; isPremium: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [adding, setAdding] = useState<{ ids: string[]; done: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<Completion>(`/api/series/missing?${new URLSearchParams({ name })}`).then(
      (result) => {
        if (!cancelled) setCompletion(result.ok ? result.data : { found: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [name]);

  const found = completion?.found ? completion : null;
  const editions = useSeriesEditions(
    found && found.missing.length > 0
      ? {
          titles: found.missing.map((volume) => volume.title),
          author: found.author,
          referenceBookIds: found.referenceBookIds,
        }
      : null,
  );

  if (completion === null) return <SeriesSearchPlaceholder label="Recherche des autres tomes…" />;
  if (!found || found.total === 0) return null;
  const { total, missingCount, missing, author } = found;

  if (missingCount === 0) {
    return <p className="mt-2 text-xs text-stone-500">Vous avez tous les tomes parus ({total}).</p>;
  }

  async function add(volumes: MissingVolume[]) {
    setAdding({ ids: volumes.map((volume) => volume.id), done: 0 });
    const added: string[] = [];
    // L'un après l'autre : les ajouts sont limités en débit, et la progression s'affiche.
    for (const volume of volumes) {
      const result = await addSeriesVolume({
        volume,
        author,
        seriesName: name,
        total,
        edition: editions?.get(volume.title),
      });
      if (!result.ok) {
        toast(result.message, "error");
        break;
      }
      added.push(volume.id);
      setAdding({ ids: volumes.map((entry) => entry.id), done: added.length });
    }
    setAdding(null);
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
        {!isPremium && (
          <Link
            href="/account#premium"
            className="text-accent-700 flex min-h-8 items-center gap-1.5 text-xs font-medium hover:underline"
          >
            <LockSimple size={12} aria-hidden="true" />
            Ajouter en un clic avec Premium
          </Link>
        )}
        {isPremium && missing.length > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => add(missing)}
            isLoading={adding !== null && adding.ids.length > 1}
            disabled={adding !== null}
            className="px-3 py-2 text-sm"
          >
            {adding && adding.ids.length > 1
              ? `Ajout ${Math.min(adding.done + 1, adding.ids.length)} sur ${adding.ids.length}…`
              : "Tout ajouter à ma pile"}
          </Button>
        )}
      </div>
      {editions === null && (
        <p className="mt-1 text-xs text-stone-500" role="status">
          Recherche des couvertures, dans la collection de vos tomes…
        </p>
      )}
      <ul className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6">
        {missing.map((volume) => (
          <li key={volume.id} className="w-[5.5rem] shrink-0 sm:w-24">
            <MissingVolumeCover
              title={volume.title}
              author={author}
              edition={editions?.get(volume.title)}
              loading={editions === null}
            />
            <p className="mt-2 text-xs font-medium text-stone-700">Tome {volume.index}</p>
            <p className="line-clamp-2 text-xs text-stone-500" title={volume.title}>
              {volume.title}
            </p>
            {isPremium && (
              <button
                type="button"
                onClick={() => add([volume])}
                disabled={adding !== null}
                className="text-accent-700 mt-1 flex min-h-8 items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
              >
                <Plus size={12} aria-hidden="true" />
                {adding?.ids.includes(volume.id) ? "Ajout…" : "Ajouter"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
