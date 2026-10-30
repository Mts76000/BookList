import { BookCover } from "@/components/book-cover";
import type { Edition } from "@/lib/series-editions";

/**
 * Couverture d'un tome pas encore dans la bibliothèque : un emplacement qui pulse pendant
 * la recherche de son édition, puis la vraie couverture (ou une couverture générée), dans
 * un cadre en pointillés pour la distinguer des tomes possédés.
 */
export function MissingVolumeCover({
  title,
  author,
  edition,
  loading,
  className = "",
}: {
  title: string;
  author: string;
  edition: Edition | null | undefined;
  loading: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-sm)] border border-dashed border-stone-300 p-1 ${className}`}
    >
      {loading ? (
        <div
          className="aspect-[2/3] w-full animate-pulse rounded-[4px] bg-stone-200/70"
          role="status"
          aria-label={`Recherche de la couverture de ${title}`}
        />
      ) : (
        <BookCover
          coverUrl={edition?.coverUrl ?? null}
          alt={title}
          author={author}
          className="aspect-[2/3] w-full rounded-[4px] opacity-90"
        />
      )}
    </div>
  );
}

/** Ligne d'attente pendant que Wikidata cherche les tomes de la saga. */
export function SeriesSearchPlaceholder({ label }: { label: string }) {
  return (
    <div className="mt-4 border-t border-stone-100 pt-4" role="status">
      <p className="flex items-center gap-2 text-sm text-stone-500">
        <span
          className="border-t-accent-500 size-3.5 animate-spin rounded-full border-2 border-stone-200"
          aria-hidden="true"
        />
        {label}
      </p>
      <div className="mt-3 flex gap-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="aspect-[2/3] w-[5.5rem] animate-pulse rounded-[var(--radius-sm)] bg-stone-100 sm:w-24"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
