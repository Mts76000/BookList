"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Star } from "@phosphor-icons/react";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface FavoriteBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  userRating: number | null;
}

interface FavoritePickerProps {
  year: number;
  favorite: FavoriteBook | null;
  /** Vrai si le coup de cœur a été choisi, faux s'il est déduit des notes. */
  isChosen: boolean;
  candidates: FavoriteBook[];
}

/**
 * Coup de cœur de l'année : affiché tel quel, avec la possibilité d'en choisir un autre
 * parmi les livres terminés dans l'année, ou de revenir au choix automatique.
 */
export function FavoritePicker({ year, favorite, isChosen, candidates }: FavoritePickerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function choose(bookId: string) {
    setPendingId(bookId);
    const result = await apiFetch("/api/year-favorite", {
      method: "PUT",
      json: { year, bookId },
    });
    setPendingId(null);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    setIsOpen(false);
    router.refresh();
  }

  async function resetToAutomatic() {
    setPendingId("automatic");
    const result = await apiFetch(`/api/year-favorite?year=${year}`, { method: "DELETE" });
    setPendingId(null);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="card p-5">
      {favorite ? (
        <div className="flex items-center gap-5">
          <Link href={`/books/${favorite.id}`} className="shrink-0">
            <BookCover
              coverUrl={favorite.coverUrl}
              alt={favorite.title}
              author={favorite.author}
              tactile
              className="h-32 w-[5.5rem] rounded-[var(--radius-sm)]"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-accent-700 text-xs font-medium">
              Coup de cœur{isChosen ? "" : " (d'après vos notes)"}
            </p>
            <Link
              href={`/books/${favorite.id}`}
              className="mt-1 block font-serif text-xl text-stone-900 hover:underline"
            >
              {favorite.title}
            </Link>
            <p className="text-sm text-stone-500">{favorite.author}</p>
            {favorite.userRating !== null && (
              <p className="mt-2 text-sm text-stone-700">Noté {favorite.userRating}/5</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-accent-700 text-xs font-medium">Coup de cœur</p>
          <p className="mt-1 text-sm text-stone-500">
            Quel livre vous a le plus marqué en {year} ? Il apparaîtra sur votre bilan.
          </p>
        </div>
      )}

      {!isOpen && candidates.length > 0 && (
        <Button
          variant="text"
          onClick={() => setIsOpen(true)}
          className="mt-4"
          aria-expanded={isOpen}
        >
          {favorite ? "Changer de coup de cœur" : "Choisir mon coup de cœur"}
        </Button>
      )}

      {isOpen && (
        <div className="mt-5 border-t border-stone-200 pt-4">
          <p id="favorite-picker-label" className="mb-3 text-sm font-medium text-stone-900">
            Vos lectures de {year}
          </p>
          <ul
            aria-labelledby="favorite-picker-label"
            className="-mx-2 max-h-80 space-y-1 overflow-y-auto"
          >
            {candidates.map((candidate) => {
              const isCurrent = candidate.id === favorite?.id;
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => !isCurrent && choose(candidate.id)}
                    disabled={pendingId !== null}
                    aria-pressed={isCurrent}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left transition ${
                      isCurrent ? "bg-accent-50" : "hover:bg-stone-100"
                    } disabled:cursor-wait`}
                  >
                    <BookCover
                      coverUrl={candidate.coverUrl}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded-[4px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-900">
                        {candidate.title}
                      </span>
                      <span className="block truncate text-xs text-stone-500">
                        {candidate.author}
                      </span>
                    </span>
                    {candidate.userRating !== null && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-stone-500">
                        {candidate.userRating}
                        <Star className="h-3 w-3 text-amber-500" weight="fill" aria-hidden="true" />
                      </span>
                    )}
                    {pendingId === candidate.id ? (
                      <span
                        className="size-4 shrink-0 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"
                        aria-hidden="true"
                      />
                    ) : (
                      isCurrent && (
                        <Check className="text-accent-600 h-4 w-4 shrink-0" aria-hidden="true" />
                      )
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Button variant="text" onClick={() => setIsOpen(false)}>
              Fermer
            </Button>
            {isChosen && (
              <Button variant="text" onClick={resetToAutomatic} disabled={pendingId !== null}>
                Revenir au choix d&apos;après mes notes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
