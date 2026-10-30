"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface ReadingGoalProps {
  year: number;
  /** Objectif de l'année, `null` s'il n'a pas encore été fixé. */
  target: number | null;
  /** Livres terminés depuis le 1er janvier. */
  booksRead: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Où en est l'utilisateur par rapport à un rythme régulier sur l'année. On compare au nombre
 * de livres qu'il « devrait » avoir lus à cette date pour tenir l'objectif, arrondi à l'entier
 * inférieur : on n'annonce pas un retard tant qu'un livre entier n'est pas en jeu.
 */
function paceMessage(year: number, target: number, booksRead: number): string {
  if (booksRead >= target) return "Objectif atteint. Bravo !";

  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const elapsed = Math.min(Math.max((Date.now() - start) / (end - start), 0), 1);
  const expected = Math.floor(target * elapsed);
  const diff = booksRead - expected;

  const remaining = target - booksRead;
  const daysLeft = Math.max(Math.ceil((end - Date.now()) / DAY_MS), 1);
  const cadence = Math.max(Math.round(daysLeft / remaining), 1);
  const plural = (n: number) => (n > 1 ? "s" : "");
  const rhythm = `Encore ${remaining} livre${plural(remaining)}, soit un tous les ${cadence} jour${plural(cadence)}.`;

  if (diff > 0) return `En avance de ${diff} livre${plural(diff)}. ${rhythm}`;
  if (diff < 0) return `${-diff} livre${plural(-diff)} de retard sur le rythme. ${rhythm}`;
  return `Pile dans le rythme. ${rhythm}`;
}

export function ReadingGoal({ year, target, booksRead }: ReadingGoalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(target === null);
  const [value, setValue] = useState(target?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await apiFetch("/api/reading-goal", { method: "PUT", json: { target: value } });
    setIsSaving(false);

    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast("Objectif enregistré.", "success");
    setIsEditing(false);
    router.refresh();
  }

  async function handleRemove() {
    setIsRemoving(true);
    const result = await apiFetch("/api/reading-goal", { method: "DELETE" });
    setIsRemoving(false);

    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    setValue("");
    router.refresh();
  }

  const progress = target ? Math.min(booksRead / target, 1) : 0;

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-medium text-stone-900">Objectif {year}</h2>
        {target !== null && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="-m-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            aria-label="Modifier l'objectif"
          >
            <PencilSimple className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {target !== null && !isEditing && (
        <div className="mt-4">
          <p className="font-serif text-3xl text-stone-900 tabular-nums">
            {booksRead}
            <span className="text-lg text-stone-400"> / {target} livres</span>
          </p>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-label={`Objectif ${year}`}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.min(booksRead, target)}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${progress >= 1 ? "bg-moss-500" : "bg-accent-500"}`}
              style={{ width: `${Math.max(progress * 100, booksRead > 0 ? 2 : 0)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-stone-500">{paceMessage(year, target, booksRead)}</p>
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field
            label={`Combien de livres voulez-vous lire en ${year} ?`}
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex : 24"
            helperText={
              booksRead > 0
                ? `Vous avez déjà terminé ${booksRead} livre${booksRead > 1 ? "s" : ""} cette année.`
                : undefined
            }
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
              {target === null ? "Fixer l'objectif" : "Enregistrer"}
            </Button>
            {target !== null && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setValue(target.toString());
                    setIsEditing(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  isLoading={isRemoving}
                  onClick={handleRemove}
                  className="w-full text-stone-500 sm:ml-auto sm:w-auto"
                >
                  Retirer l&apos;objectif
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
