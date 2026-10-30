"use client";

import { useId } from "react";
import { Field } from "@/components/ui/field";
import type { KnownSeriesSummary } from "@/lib/series-detection";

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

/**
 * « Fait partie d'une saga » à l'ajout d'un livre : cochée d'avance quand le titre ou une
 * saga existante du même auteur l'indique, avec le nom et le tome proposés, modifiables.
 */
export function SeriesChoice({
  value,
  onChange,
  known,
}: {
  value: SeriesChoiceValue;
  onChange: (value: SeriesChoiceValue) => void;
  known: KnownSeriesSummary[];
}) {
  const checkboxId = useId();
  const listId = useId();

  function changeName(name: string) {
    // Une saga existante choisie : on propose son tome suivant et son nombre de tomes.
    const match = known.find((entry) => entry.name.toLowerCase() === name.trim().toLowerCase());
    onChange({
      ...value,
      name,
      index: value.index || !match ? value.index : String(match.nextIndex),
      total: value.total || !match?.total ? value.total : String(match.total),
    });
  }

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
        <span className="text-sm font-medium text-stone-800">
          {value.detected && value.name
            ? `Ranger dans la saga « ${value.name} »${value.index ? `, tome ${value.index}` : ""}`
            : "Fait partie d'une saga"}
        </span>
      </label>
      {value.detected && value.enabled && (
        <p className="mt-1 pl-7 text-xs text-stone-500">Repéré d&apos;après le titre.</p>
      )}

      {value.enabled && (
        <div className="mt-3 grid grid-cols-[1fr_5rem] gap-3">
          <Field
            label="Saga"
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
      )}
    </div>
  );
}
