"use client";

import { useEffect, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { BookCover } from "@/components/book-cover";
import { SeriesEditor, type EditorBook, type SeriesDraft } from "@/components/series-editor";

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
 * Sagas repérées dans la bibliothèque, à confirmer : « Vérifier » ouvre l'éditeur prérempli,
 * où l'on corrige l'ordre ou retire un livre avant d'enregistrer ; « Ignorer » ne la propose
 * plus. Rien n'est rangé sans confirmation.
 */
export function SeriesSuggestions({
  suggestions,
  library,
  existingNames,
}: {
  suggestions: SuggestionView[];
  library: EditorBook[];
  existingNames: string[];
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
          <li
            key={suggestion.key}
            className="border-accent-200 bg-accent-50/60 flex flex-col gap-3 rounded-[var(--radius-md)] border p-4"
          >
            <div>
              <p className="font-serif text-lg text-stone-900">
                {suggestion.existing
                  ? `Ajouter à « ${suggestion.name} » ?`
                  : `Une saga « ${suggestion.name} » ?`}
              </p>
              <p className="text-xs text-stone-500">
                {suggestion.reason === "title"
                  ? "Le numéro de tome figure dans le titre."
                  : suggestion.existing
                    ? "Même auteur, titre proche."
                    : "Même auteur, titres proches : vérifiez l'ordre des tomes."}
              </p>
            </div>
            <ul className="flex gap-2">
              {suggestion.books.slice(0, 5).map((entry) => (
                <li key={entry.id} className="w-12" title={entry.title}>
                  <BookCover
                    coverUrl={entry.coverUrl}
                    alt={entry.title}
                    author={entry.author}
                    className="aspect-[2/3] w-full rounded-[4px]"
                  />
                </li>
              ))}
              {suggestion.books.length > 5 && (
                <li className="flex w-12 items-center justify-center text-xs text-stone-500">
                  +{suggestion.books.length - 5}
                </li>
              )}
            </ul>
            <div className="mt-auto flex gap-2">
              <SeriesEditor
                library={library}
                existingNames={existingNames}
                initial={suggestion.draft}
                previousName={suggestion.existing ? suggestion.name : undefined}
                triggerLabel="Vérifier"
                triggerVariant="primary"
                triggerClassName="flex-1 sm:flex-none"
              />
              <button
                type="button"
                onClick={() => dismiss(suggestion.key)}
                className="min-h-11 px-3 text-sm font-medium text-stone-500 hover:text-stone-900"
              >
                Ignorer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
