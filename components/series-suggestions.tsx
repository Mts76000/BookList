"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockSimple, Sparkle } from "@phosphor-icons/react";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SeriesEditor, type EditorBook, type SeriesDraft } from "@/components/series-editor";
import { apiFetch } from "@/lib/api-client";
import { addSeriesVolume, type VolumeToAdd } from "@/lib/add-series-volume";
import { useSeriesEditions } from "@/lib/use-series-editions";
import { MissingVolumeCover } from "@/components/missing-volume-cover";

export interface SuggestionView {
  key: string;
  name: string;
  existing: boolean;
  reason: "title" | "author";
  /** Livres repérés, à afficher. */
  books: { id: string; title: string; author: string; coverUrl: string | null }[];
  /** Saga proposée, prête à vérifier dans l'éditeur (tomes existants compris). */
  draft: SeriesDraft;
}

type Identified =
  | { found: false }
  | {
      found: true;
      name: string;
      total: number;
      owned: { bookId: string; seriesIndex: number | null }[];
      missingCount: number;
      missing: (VolumeToAdd & { id: string })[];
      author: string;
    };

/** Suggestions écartées, mémorisées sur l'appareil : une préférence d'affichage, rien de plus. */
const STORAGE_KEY = "booklist-dismissed-series";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/**
 * Sagas repérées dans la bibliothèque, à confirmer. Chaque suggestion est identifiée sur
 * Wikidata : vrai nom, nombre de tomes, numéro des livres possédés et tomes manquants, que
 * Premium crée et ajoute en un clic. « Vérifier » ouvre l'éditeur prérempli, « Ignorer » ne
 * la propose plus. Rien n'est rangé sans confirmation.
 *
 * Un compte gratuit voit ce qui a été repéré (ce sont ses propres livres), mais la création
 * en un clic et les tomes manquants sont réservés à Premium.
 */
export function SeriesSuggestions({
  suggestions,
  library,
  existingNames,
  isPremium,
}: {
  suggestions: SuggestionView[];
  library: EditorBook[];
  existingNames: string[];
  isPremium: boolean;
}) {
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  // Lu après le montage : localStorage n'existe pas au rendu serveur.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique d'une préférence locale
    setDismissed(readDismissed());
  }, []);

  function dismiss(key: string) {
    const next = [...(dismissed ?? []), key];
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Stockage indisponible (navigation privée) : la suggestion revient au prochain passage.
    }
  }

  // Rien avant de connaître les suggestions écartées, pour ne pas les faire clignoter.
  if (dismissed === null) return null;
  const visible = suggestions.filter((suggestion) => !dismissed.includes(suggestion.key));
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="series-suggestions" className="mb-8">
      <h2
        id="series-suggestions"
        className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-700"
      >
        <Sparkle className="text-accent-500 h-4 w-4" weight="fill" aria-hidden="true" />
        Repéré dans votre bibliothèque
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {visible.map((suggestion) => (
          <SuggestionCard
            key={suggestion.key}
            suggestion={suggestion}
            library={library}
            existingNames={existingNames}
            isPremium={isPremium}
            onDismiss={() => dismiss(suggestion.key)}
          />
        ))}
      </ul>
    </section>
  );
}

function SuggestionCard({
  suggestion,
  library,
  existingNames,
  isPremium,
  onDismiss,
}: {
  suggestion: SuggestionView;
  library: EditorBook[];
  existingNames: string[];
  isPremium: boolean;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [identified, setIdentified] = useState<Identified | null>(null);
  // Progression de « Créer la saga et les tomes manquants » : tomes ajoutés sur le total.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Identification sur Wikidata après l'affichage : quelques secondes la première fois,
  // instantanée ensuite grâce au cache partagé.
  useEffect(() => {
    let cancelled = false;
    void apiFetch<Identified>("/api/series/identify", {
      method: "POST",
      json: { bookIds: suggestion.books.map((entry) => entry.id) },
    }).then((result) => {
      if (!cancelled) setIdentified(result.ok ? result.data : { found: false });
    });
    return () => {
      cancelled = true;
    };
  }, [suggestion.books]);

  const wikidata = identified?.found ? identified : null;
  // Couvertures des tomes manquants, dans la collection des livres repérés (Premium).
  const editions = useSeriesEditions(
    wikidata && wikidata.missing.length > 0
      ? {
          titles: wikidata.missing.map((volume) => volume.title),
          author: wikidata.author,
          referenceBookIds: suggestion.books.map((entry) => entry.id),
        }
      : null,
  );
  // Une saga existante garde le nom que l'utilisateur lui a donné ; une nouvelle prend celui
  // de Wikidata, plus fiable que les mots communs aux titres.
  const name = suggestion.existing ? suggestion.name : (wikidata?.name ?? suggestion.name);
  const indexOf = new Map(wikidata?.owned.map((entry) => [entry.bookId, entry.seriesIndex]));
  const draft: SeriesDraft = {
    name,
    total: wikidata?.total ?? suggestion.draft.total,
    volumes: suggestion.draft.volumes.map((volume) => ({
      bookId: volume.bookId,
      seriesIndex: indexOf.get(volume.bookId) ?? volume.seriesIndex,
    })),
  };

  async function createWithMissing() {
    if (!wikidata) return;
    setProgress({ done: 0, total: wikidata.missing.length });
    const saved = await apiFetch<{ name: string }>("/api/series", {
      method: "PUT",
      json: {
        name: draft.name,
        previousName: suggestion.existing ? suggestion.name : null,
        total: draft.total,
        volumes: draft.volumes,
      },
    });
    if (!saved.ok) {
      setProgress(null);
      toast(saved.message, "error");
      return;
    }
    let added = 0;
    // L'un après l'autre : les recherches et ajouts sont limités en débit.
    for (const volume of wikidata.missing) {
      const result = await addSeriesVolume({
        volume,
        author: wikidata.author,
        seriesName: saved.data.name,
        total: wikidata.total,
        edition: editions?.get(volume.title),
      });
      if (!result.ok) {
        toast(result.message, "error");
        break;
      }
      added += 1;
      setProgress({ done: added, total: wikidata.missing.length });
    }
    setProgress(null);
    toast(
      added > 0
        ? `Saga « ${saved.data.name} » créée, ${added} tome${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} à votre pile.`
        : `Saga « ${saved.data.name} » créée.`,
      "success",
    );
    router.refresh();
  }

  return (
    <li className="border-accent-200 bg-accent-50/60 flex flex-col gap-3 rounded-[var(--radius-md)] border p-4">
      <div>
        <p className="font-serif text-lg text-stone-900">
          {suggestion.existing ? `Ajouter à « ${name} » ?` : `Une saga « ${name} » ?`}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-stone-500" aria-live="polite">
          {(identified === null || (wikidata && editions === null)) && (
            <span
              className="border-t-accent-500 size-3 shrink-0 animate-spin rounded-full border-2 border-stone-200"
              aria-hidden="true"
            />
          )}
          {wikidata
            ? `${wikidata.total} tomes, vous en avez ${suggestion.books.length}${
                wikidata.missingCount > 0 ? `, il en manque ${wikidata.missingCount}` : ""
              }.`
            : identified === null
              ? "Recherche des autres tomes de la saga…"
              : suggestion.reason === "title"
                ? "Le numéro de tome figure dans le titre."
                : suggestion.existing
                  ? "Même auteur, titre proche."
                  : "Même auteur, titres proches : vérifiez l'ordre des tomes."}
        </p>
      </div>
      {/* Livres possédés, puis tomes manquants (couverture réelle pour Premium). Pendant la
          recherche Wikidata, des emplacements qui pulsent annoncent la suite. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {suggestion.books.slice(0, 5).map((entry) => (
          <li key={entry.id} className="w-12 shrink-0" title={entry.title}>
            <BookCover
              coverUrl={entry.coverUrl}
              alt={entry.title}
              author={entry.author}
              className="aspect-[2/3] w-full rounded-[4px]"
            />
          </li>
        ))}
        {identified === null &&
          [0, 1, 2].map((index) => (
            <li
              key={`pending-${index}`}
              className="aspect-[2/3] w-12 shrink-0 animate-pulse rounded-[4px] bg-stone-200/70"
              style={{ animationDelay: `${index * 150}ms` }}
              aria-hidden="true"
            />
          ))}
        {wikidata &&
          wikidata.missing.map((volume) => (
            <li
              key={volume.id}
              className="w-12 shrink-0"
              title={`Tome ${volume.index} : ${volume.title}`}
            >
              <MissingVolumeCover
                title={volume.title}
                author={wikidata.author}
                edition={editions?.get(volume.title)}
                loading={editions === null}
                className="p-0.5"
              />
            </li>
          ))}
      </ul>

      {isPremium ? (
        <div className="mt-auto flex flex-wrap gap-2">
          {wikidata && wikidata.missing.length > 0 ? (
            <>
              <Button
                type="button"
                onClick={createWithMissing}
                isLoading={progress !== null}
                className="w-full"
              >
                {progress
                  ? `Ajout du tome ${Math.min(progress.done + 1, progress.total)} sur ${progress.total}…`
                  : `${suggestion.existing ? "Ajouter" : "Créer la saga"} et les ${wikidata.missing.length} tome${wikidata.missing.length > 1 ? "s" : ""} manquant${wikidata.missing.length > 1 ? "s" : ""}`}
              </Button>
              <SeriesEditor
                key={JSON.stringify(draft)}
                library={library}
                existingNames={existingNames}
                initial={draft}
                previousName={suggestion.existing ? suggestion.name : undefined}
                triggerLabel="Vérifier d'abord"
                triggerVariant="ghost"
              />
            </>
          ) : (
            <SeriesEditor
              key={JSON.stringify(draft)}
              library={library}
              existingNames={existingNames}
              initial={draft}
              previousName={suggestion.existing ? suggestion.name : undefined}
              triggerLabel="Vérifier"
              triggerVariant="primary"
              triggerClassName="flex-1 sm:flex-none"
            />
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 px-3 text-sm font-medium text-stone-500 hover:text-stone-900"
          >
            Ignorer
          </button>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Link
            href="/account/premium"
            className="text-accent-700 flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <LockSimple size={14} aria-hidden="true" />
            {wikidata && wikidata.missingCount > 0
              ? "Créer la saga et ajouter les tomes manquants avec Premium"
              : "Créer la saga en un clic avec Premium"}
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 px-3 text-sm font-medium text-stone-500 hover:text-stone-900"
          >
            Ignorer
          </button>
        </div>
      )}
    </li>
  );
}
