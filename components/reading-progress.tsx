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

/** Barre de progression seule, réutilisée sur les cartes « En ce moment ». */
export function ProgressBar({
  currentPage,
  pageCount,
}: {
  currentPage: number | null;
  pageCount: number | null;
}) {
  if (!currentPage || !pageCount) return null;
  const ratio = Math.min(currentPage / pageCount, 1);
  return (
    <div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-label="Progression"
        aria-valuemin={0}
        aria-valuemax={pageCount}
        aria-valuenow={currentPage}
      >
        <div className="bg-accent-500 h-full rounded-full" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-stone-500 tabular-nums">
        Page {currentPage} sur {pageCount}, {Math.round(ratio * 100)} %
      </p>
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
 * corrige au clavier ou avec « +10 », « +25 », « +50 », puis qu'on enregistre. Les
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
    const base = target ?? from;
    setPage(String(pageCount ? Math.min(base + step, pageCount) : base + step));
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

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
        J&apos;en suis à la page
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          max={pageCount ?? undefined}
          required
          value={page}
          onChange={(e) => setPage(e.target.value)}
          className="border-border focus:border-accent-400 focus:ring-accent-400/15 w-24 rounded-[var(--radius-sm)] border bg-white px-3 py-2.5 text-center text-lg font-medium text-stone-900 tabular-nums focus:ring-4 focus:outline-none"
        />
        {pageCount && <span className="text-sm text-stone-500 tabular-nums">sur {pageCount}</span>}
        <Button
          type="submit"
          isLoading={isSaving}
          disabled={target === null || target === currentPage}
          className="ml-auto px-4"
        >
          Enregistrer
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => addPages(step)}
            className="min-h-9 rounded-full border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 tabular-nums transition hover:border-stone-300 hover:text-stone-900"
            aria-label={`Ajouter ${step} pages`}
          >
            +{step} p.
          </button>
        ))}
        <span className="text-xs text-stone-500" aria-live="polite">
          {delta > 0
            ? `${delta} page${delta > 1 ? "s" : ""} lue${delta > 1 ? "s" : ""} depuis la dernière fois`
            : delta < 0
              ? "Retour en arrière : la page sera corrigée"
              : ""}
        </span>
      </div>
    </form>
  );
}
