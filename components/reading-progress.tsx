"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface ReadingProgressProps {
  bookId: string;
  currentPage: number | null;
  pageCount: number | null;
  /** Version resserrée des cartes de l'accueil : champ et bouton sur une ligne, sans titre. */
  compact?: boolean;
}

/**
 * Progression d'une lecture : le pourcentage en grand, la page en petit, puis la barre.
 * `small` pour les lignes secondaires (autres lectures en cours de l'accueil).
 */
export function ProgressBar({
  currentPage,
  pageCount,
  size = "default",
}: {
  currentPage: number | null;
  pageCount: number | null;
  size?: "default" | "small";
}) {
  if (!currentPage || !pageCount) return null;
  const ratio = Math.min(currentPage / pageCount, 1);
  const percent = Math.round(ratio * 100);
  const small = size === "small";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`text-stone-900 tabular-nums ${small ? "text-xs font-medium" : "font-serif text-2xl leading-none"}`}
        >
          {percent}
          <span className={small ? "" : "ml-0.5 text-base text-stone-500"}> %</span>
        </p>
        <p className="text-xs text-stone-500 tabular-nums">
          p. {currentPage} <span className="text-stone-400">/ {pageCount}</span>
        </p>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-stone-200/70 ${small ? "mt-1 h-1" : "mt-2 h-2"}`}
        role="progressbar"
        aria-label={`Progression : page ${currentPage} sur ${pageCount}`}
        aria-valuemin={0}
        aria-valuemax={pageCount}
        aria-valuenow={currentPage}
      >
        <div
          className="bg-accent-500 h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Où en est la lecture : une saisie de page qui met aussi à jour la journée de lecture.
 * Arrivé à la dernière page, on propose de marquer le livre comme terminé.
 */
export function ReadingProgress({
  bookId,
  currentPage,
  pageCount,
  compact = false,
}: ReadingProgressProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(currentPage?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await apiFetch<{ reachedEnd: boolean; currentPage: number }>(
      `/api/books/${bookId}/progress`,
      { method: "POST", json: { currentPage: page } },
    );
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast(result.message ?? "Progression mise à jour.", "success");
    setPage(result.data.currentPage.toString());
    setReachedEnd(result.data.reachedEnd);
    router.refresh();
  }

  async function markFinished() {
    setIsSaving(true);
    const result = await apiFetch(`/api/books/${bookId}`, {
      method: "PATCH",
      json: { status: "FINISHED", userEndDate: new Date().toISOString().slice(0, 10) },
    });
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast("Bravo, un livre de plus !", "success");
    setReachedEnd(false);
    router.refresh();
  }

  return (
    <div className={compact ? "mt-3" : "mt-5"}>
      <ProgressBar currentPage={currentPage} pageCount={pageCount} />
      {reachedEnd ? (
        <div className="bg-moss-50 border-moss-200 mt-3 flex flex-col gap-3 rounded-[var(--radius-sm)] border p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-moss-800 text-sm">Dernière page atteinte. Livre terminé ?</p>
          <Button onClick={markFinished} isLoading={isSaving} className="w-full sm:w-auto">
            Marquer comme terminé
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
          <div className={compact ? "w-24" : "w-36"}>
            <Field
              label={compact ? "Page" : "J'en suis à la page"}
              hideLabel={compact}
              placeholder={compact ? "Page" : undefined}
              type="number"
              inputMode="numeric"
              min={0}
              max={pageCount ?? undefined}
              required
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            className={compact ? "px-4" : ""}
          >
            {compact ? "OK" : "Mettre à jour"}
          </Button>
        </form>
      )}
    </div>
  );
}

/** Passe un livre de la pile à lire en lecture, depuis l'accueil. */
export function StartReadingButton({ bookId }: { bookId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const result = await apiFetch(`/api/books/${bookId}/progress`, {
      method: "POST",
      json: { currentPage: 0 },
    });
    setIsLoading(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast("Bonne lecture !", "success");
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={handleClick} isLoading={isLoading} className="w-full px-4">
      Commencer
    </Button>
  );
}

const QUICK_STEPS = [10, 25, 50];

/**
 * Où en est la lecture mise en avant sur l'accueil : la page actuelle, préremplie, qu'on
 * corrige au clavier, page par page (− / +) ou avec « +10 », « +25 », « +50 », puis qu'on
 * enregistre. Les
 * raccourcis ne font qu'ajuster le champ : rien n'est enregistré sans « Enregistrer », et
 * l'écart avec la dernière fois est affiché avant. Même route que la saisie classique : la
 * journée de lecture et la série suivent.
 */
export function QuickProgress({
  bookId,
  currentPage,
  pageCount,
}: {
  bookId: string;
  currentPage: number | null;
  pageCount: number | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputId = useId();
  const [page, setPage] = useState(currentPage?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const from = currentPage ?? 0;
  const typed = Number.parseInt(page, 10);
  const target = Number.isNaN(typed) ? null : typed;
  const delta = target === null ? 0 : target - from;

  function addPages(step: number) {
    const next = Math.max((target ?? from) + step, 0);
    setPage(String(pageCount ? Math.min(next, pageCount) : next));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (target === null) return;
    setIsSaving(true);
    const result = await apiFetch<{ reachedEnd: boolean; currentPage: number }>(
      `/api/books/${bookId}/progress`,
      { method: "POST", json: { currentPage: target } },
    );
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast(result.message ?? "Progression mise à jour.", "success");
    setPage(result.data.currentPage.toString());
    setReachedEnd(result.data.reachedEnd);
    router.refresh();
  }

  async function markFinished() {
    setIsSaving(true);
    const result = await apiFetch(`/api/books/${bookId}`, {
      method: "PATCH",
      json: { status: "FINISHED", userEndDate: new Date().toISOString().slice(0, 10) },
    });
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast("Bravo, un livre de plus !", "success");
    router.refresh();
  }

  if (reachedEnd) {
    return (
      <div className="bg-moss-50 border-moss-200 flex flex-col gap-3 rounded-[var(--radius-sm)] border p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-moss-800 text-sm">Dernière page atteinte. Livre terminé ?</p>
        <Button onClick={markFinished} isLoading={isSaving} className="w-full sm:w-auto">
          Marquer comme terminé
        </Button>
      </div>
    );
  }

  const stepButton =
    "flex size-11 shrink-0 items-center justify-center text-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40";

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
          Où en êtes-vous ?
        </label>
        <span
          className={`text-xs font-medium tabular-nums ${delta < 0 ? "text-stone-500" : "text-moss-700"}`}
          aria-live="polite"
        >
          {delta > 0
            ? `+${delta} page${delta > 1 ? "s" : ""}`
            : delta < 0
              ? "Retour en arrière"
              : ""}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="focus-within:border-accent-400 focus-within:ring-accent-400/15 inline-flex items-center overflow-hidden rounded-[var(--radius-sm)] border border-stone-200 bg-white focus-within:ring-4">
          <button
            type="button"
            onClick={() => addPages(-1)}
            disabled={(target ?? from) <= 0}
            className={stepButton}
            aria-label="Une page de moins"
          >
            −
          </button>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            max={pageCount ?? undefined}
            required
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="w-16 [appearance:textfield] border-x border-stone-100 bg-transparent py-2 text-center text-xl font-medium text-stone-900 tabular-nums focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => addPages(1)}
            disabled={pageCount !== null && (target ?? from) >= pageCount}
            className={stepButton}
            aria-label="Une page de plus"
          >
            +
          </button>
        </div>
        {pageCount && <span className="text-sm text-stone-500 tabular-nums">sur {pageCount}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => addPages(step)}
            className="min-h-9 rounded-full bg-stone-100 px-3 text-sm font-medium text-stone-700 tabular-nums transition hover:bg-stone-200 hover:text-stone-900 active:scale-95"
            aria-label={`Ajouter ${step} pages`}
          >
            +{step}
          </button>
        ))}
        <Button
          type="submit"
          isLoading={isSaving}
          disabled={target === null || target === currentPage}
          className="ml-auto px-5"
        >
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
