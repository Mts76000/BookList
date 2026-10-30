"use client";

import { useState } from "react";
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
