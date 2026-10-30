"use client";

import { useId } from "react";
import { Field } from "@/components/ui/field";
import { normalizeText, type KnownSeriesSummary } from "@/lib/series-detection";

export interface SeriesChoiceValue {
  enabled: boolean;
  name: string;
  index: string;
  total: string;
  /** Proposition venue du titre ou d'une saga existante, et non saisie à la main. */
  detected: boolean;
}

export const EMPTY_SERIES_CHOICE: SeriesChoiceValue = {
  enabled: false,
  name: "",
  index: "",
  total: "",
  detected: false,
};

/** Nombre de sagas du même auteur proposées en raccourci. */
const MAX_SHORTCUTS = 4;

function findKnown(known: KnownSeriesSummary[], name: string) {
  const key = name.trim().toLowerCase();
  return key ? known.find((entry) => entry.name.toLowerCase() === key) : undefined;
}

/**
 * « Fait partie d'une saga » à l'ajout d'un livre : cochée d'avance quand le titre ou une
 * saga existante du même auteur l'indique, avec le nom et le tome proposés, modifiables.
 *
 * Les sagas du même auteur déjà dans la bibliothèque sont proposées en premier, mais jamais
 * imposées : « Nouvelle saga » permet toujours d'en créer une autre (un autre cycle du même
 * auteur, une autre collection), avec le nom repéré dans le titre quand il y en a un.
 */
export function SeriesChoice({
  value,
  onChange,
  known,
  author,
  titleHint,
}: {
  value: SeriesChoiceValue;
  onChange: (value: SeriesChoiceValue) => void;
  known: KnownSeriesSummary[];
  /** Auteur du livre ajouté, pour mettre ses sagas en avant. */
  author: string;
  /** Saga repérée dans le titre (« Nom, tome 2 »), proposée pour une nouvelle saga. */
  titleHint: { name: string; index: number | null } | null;
}) {
  const checkboxId = useId();
  const listId = useId();

  const authorWords = new Set(
    normalizeText(author)
      .split(" ")
      .filter((word) => word.length > 2),
  );
  const shortcuts = known
    .filter((entry) =>
      entry.authors.some((name) =>
        normalizeText(name)
          .split(" ")
          .some((word) => authorWords.has(word)),
      ),
    )
    .slice(0, MAX_SHORTCUTS);

  const current = findKnown(known, value.name);
  const isNew = value.name.trim() !== "" && !current;

  function pickKnown(entry: KnownSeriesSummary) {
    onChange({
      enabled: true,
      name: entry.name,
      index: String(entry.nextIndex),
      total: entry.total ? String(entry.total) : "",
      detected: false,
    });
  }

  function pickNew() {
    // Le nom repéré dans le titre, s'il ne désigne pas déjà une saga de la bibliothèque.
    const hint = titleHint && !findKnown(known, titleHint.name) ? titleHint : null;
    onChange({
      enabled: true,
      name: hint?.name ?? "",
      index: hint?.index?.toString() ?? "1",
      total: "",
      detected: false,
    });
  }

  function changeName(name: string) {
    // Une saga existante choisie : on propose son tome suivant et son nombre de tomes.
    const match = findKnown(known, name);
    onChange({
      ...value,
      name,
      index: value.index || !match ? value.index : String(match.nextIndex),
      total: value.total || !match?.total ? value.total : String(match.total),
    });
  }

  const tome = value.index ? `, tome ${value.index}` : "";
  const label =
    value.detected && value.name
      ? current
        ? `Ranger dans la saga « ${value.name} »${tome}`
        : `Créer la saga « ${value.name} »${tome}`
      : "Fait partie d'une saga";

  return (
    <div
      className={`rounded-[var(--radius-sm)] p-3 ring-1 ${
        value.enabled && value.detected ? "bg-accent-50/60 ring-accent-200" : "ring-stone-200"
      }`}
    >
      <label htmlFor={checkboxId} className="flex min-h-8 cursor-pointer items-center gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="accent-accent-600 size-4"
        />
        <span className="text-sm font-medium text-stone-800">{label}</span>
      </label>
      {value.detected && value.enabled && (
        <p className="mt-1 pl-7 text-xs text-stone-500">
          {current ? "Saga déjà dans votre bibliothèque." : "Saga repérée automatiquement."} Vous
          pouvez en choisir une autre ou en créer une.
        </p>
      )}

      {value.enabled && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir la saga">
            {shortcuts.map((entry) => {
              const selected = current?.name === entry.name;
              return (
                <button
                  key={entry.name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pickKnown(entry)}
                  className={`max-w-full truncate rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "bg-accent-600 border border-transparent text-white"
                      : "bg-card border border-stone-200 text-stone-700 hover:border-stone-300"
                  }`}
                >
                  {entry.name}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={isNew}
              onClick={pickNew}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isNew
                  ? "bg-accent-600 border border-transparent text-white"
                  : "border border-dashed border-stone-300 text-stone-700 hover:border-stone-400"
              }`}
            >
              + Nouvelle saga
            </button>
          </div>

          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Field
              label={isNew ? "Nouvelle saga" : "Saga"}
              value={value.name}
              onChange={(e) => changeName(e.target.value)}
              list={listId}
              autoComplete="off"
              placeholder="Ex : Dune"
            />
            <Field
              label="Tome"
              type="number"
              inputMode="numeric"
              min={0}
              value={value.index}
              onChange={(e) => onChange({ ...value, index: e.target.value })}
            />
            <datalist id={listId}>
              {known.map((entry) => (
                <option key={entry.name} value={entry.name} />
              ))}
            </datalist>
          </div>
        </div>
      )}
    </div>
  );
}
