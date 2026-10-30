import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { StartReadingButton } from "@/components/reading-progress";

export interface NextRead {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  /** Raison de la suggestion, quand elle vient des goûts de l'utilisateur. */
  reason: string | null;
}

interface NextReadsProps {
  books: NextRead[];
  title: string;
  isPremium: boolean;
}

/**
 * Livres de la pile à lire à commencer, chacun avec un bouton « Commencer ». Pour Premium,
 * ils sont classés d'après les goûts, avec la raison ; sinon ce sont les derniers ajoutés,
 * et un simple lien signale la version personnalisée, sans encombrer la lecture.
 */
export function NextReads({ books, title, isPremium }: NextReadsProps) {
  if (books.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium text-stone-500">{title}</h2>
        <Link
          href="/books?status=TO_READ"
          className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
        >
          Toute la pile
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {books.map((entry) => (
          <li key={entry.id} className="card flex w-64 shrink-0 snap-start flex-col p-4 sm:w-auto">
            <Link href={`/books/${entry.id}`} className="flex gap-3">
              <BookCover
                coverUrl={entry.coverUrl}
                alt={entry.title}
                author={entry.author}
                className="h-20 w-14 shrink-0 rounded-[var(--radius-sm)]"
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-stone-900">{entry.title}</p>
                <p className="truncate text-xs text-stone-500">{entry.author}</p>
                {entry.reason && (
                  <p className="text-accent-700 mt-1 line-clamp-2 text-xs">{entry.reason}</p>
                )}
              </div>
            </Link>
            <div className="mt-auto pt-3">
              <StartReadingButton bookId={entry.id} />
            </div>
          </li>
        ))}
      </ul>
      {!isPremium && (
        <p className="mt-2 text-xs text-stone-500">
          Ici, les derniers livres ajoutés à votre pile. Avec{" "}
          <Link href="/account#premium" className="text-accent-700 font-medium hover:underline">
            Premium
          </Link>
          , votre pile est triée selon vos goûts : suites de sagas, auteurs et genres que vous notez
          le mieux.
        </p>
      )}
    </section>
  );
}
