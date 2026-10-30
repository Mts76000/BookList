import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";

export interface SeriesVolume {
  id: string;
  title: string;
  seriesIndex: number | null;
}

interface SeriesNavProps {
  seriesName: string;
  current: { id: string; seriesIndex: number | null; seriesTotal: number | null };
  volumes: SeriesVolume[];
}

/**
 * Place du livre dans sa saga, avec le tome précédent et le suivant de la bibliothèque : on
 * passe d'un tome à l'autre sans repasser par la liste.
 */
export function SeriesNav({ seriesName, current, volumes }: SeriesNavProps) {
  const ordered = [...volumes].sort(
    (a, b) => (a.seriesIndex ?? Infinity) - (b.seriesIndex ?? Infinity),
  );
  const position = ordered.findIndex((volume) => volume.id === current.id);
  const previous = position > 0 ? ordered[position - 1] : null;
  const next = position >= 0 && position < ordered.length - 1 ? ordered[position + 1] : null;
  const total = current.seriesTotal ?? null;

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-lg text-stone-900">{seriesName}</h2>
        <Link
          href="/books/sagas"
          className="shrink-0 text-sm font-medium text-stone-600 transition hover:text-stone-900"
        >
          Mes sagas
        </Link>
      </div>
      {current.seriesIndex !== null && (
        <p className="mt-1 text-sm text-stone-500">
          Tome {current.seriesIndex}
          {total ? ` sur ${total}` : ""}, {ordered.length} dans votre bibliothèque
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {previous ? (
          <Link
            href={`/books/${previous.id}`}
            className="flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-stone-200 px-3 py-2 text-sm hover:border-stone-300"
          >
            <CaretLeft className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs text-stone-500">
                {previous.seriesIndex !== null ? `Tome ${previous.seriesIndex}` : "Précédent"}
              </span>
              <span className="block truncate text-stone-900">{previous.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/books/${next.id}`}
            className="flex min-h-11 items-center justify-end gap-2 rounded-[var(--radius-sm)] border border-stone-200 px-3 py-2 text-right text-sm hover:border-stone-300"
          >
            <span className="min-w-0">
              <span className="block text-xs text-stone-500">
                {next.seriesIndex !== null ? `Tome ${next.seriesIndex}` : "Suivant"}
              </span>
              <span className="block truncate text-stone-900">{next.title}</span>
            </span>
            <CaretRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
          </Link>
        ) : (
          current.seriesIndex !== null &&
          (total === null || current.seriesIndex < total) && (
            <Link
              href="/books/add"
              className="flex min-h-11 items-center justify-end rounded-[var(--radius-sm)] border border-dashed border-stone-300 px-3 py-2 text-right text-sm text-stone-600 hover:border-stone-400"
            >
              Ajouter le tome {current.seriesIndex + 1}
            </Link>
          )
        )}
      </div>
    </section>
  );
}
