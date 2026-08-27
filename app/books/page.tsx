import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { uniqueGenres } from "@/lib/genres";
import { BooksFilter } from "@/components/books-filter";
import { BookCover } from "@/components/book-cover";
import { buttonClasses } from "@/components/ui/button";

const BOOKS_PER_PAGE = 12;

const STATUS_LABELS: Record<string, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  FINISHED: "Terminé",
};

const STATUS_DOT: Record<string, string> = {
  TO_READ: "bg-stone-400",
  READING: "bg-accent-500",
  FINISHED: "bg-moss-500",
};

const BOOK_STATUSES = ["TO_READ", "READING", "FINISHED"] as const;
type BookStatusValue = (typeof BOOK_STATUSES)[number];

function isBookStatus(value: string | undefined): value is BookStatusValue {
  return BOOK_STATUSES.includes(value as BookStatusValue);
}

/** Un livre sans note ou sans date de fin doit finir la liste, jamais la commencer. */
function orderFor(sortBy: string): SQL[] {
  switch (sortBy) {
    case "title":
      return [asc(book.title)];
    case "rating":
      return [desc(book.userRating), asc(book.title)];
    case "oldest":
      return [asc(book.userEndDate)];
    case "pages":
      return [desc(book.pageCount), asc(book.title)];
    default:
      return [desc(book.userEndDate)];
  }
}

interface BooksSearchParams {
  sort?: string;
  genre?: string;
  page?: string;
  search?: string;
  status?: string;
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<BooksSearchParams>;
}) {
  const session = await requireAuthPage("/books");
  const params = await searchParams;

  const sortBy = params.sort || "date";
  const { genre, search, status } = params;
  const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const trimmedSearch = search?.trim();

  const filters = and(
    eq(book.userId, session.user.id),
    // Le genre est une liste séparée par des virgules : on cherche une occurrence dedans.
    genre ? ilike(book.genre, `%${genre}%`) : undefined,
    trimmedSearch
      ? or(ilike(book.title, `%${trimmedSearch}%`), ilike(book.author, `%${trimmedSearch}%`))
      : undefined,
    isBookStatus(status) ? eq(book.status, status) : undefined,
  );

  const [books, [{ value: total }], genreRows] = await Promise.all([
    db
      .select()
      .from(book)
      .where(filters)
      .orderBy(...orderFor(sortBy))
      .limit(BOOKS_PER_PAGE)
      .offset((currentPage - 1) * BOOKS_PER_PAGE),
    db.select({ value: count() }).from(book).where(filters),
    db.select({ genre: book.genre }).from(book).where(eq(book.userId, session.user.id)),
  ]);

  const genres = uniqueGenres(genreRows);
  const totalPages = Math.max(1, Math.ceil(total / BOOKS_PER_PAGE));

  return (
    <>
      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl text-stone-900 sm:text-3xl">Votre étagère</h1>
            <p className="mt-1 text-sm text-stone-500">
              {total} livre{total !== 1 ? "s" : ""} dans votre bibliothèque
            </p>
          </div>
          <Link href="/books/add" className={buttonClasses()}>
            Ajouter un livre
          </Link>
        </div>

        <BooksFilter sortBy={sortBy} genre={genre} status={status} genres={genres} />

        {books.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((entry) => (
              <Link key={entry.id} href={`/books/${entry.id}`} className="group block">
                <div className="relative">
                  <BookCover
                    coverUrl={entry.coverUrl}
                    alt={entry.title}
                    tactile
                    className="aspect-[2/3] w-full rounded-[var(--radius-sm)]"
                  />
                  {entry.userRating && (
                    <span className="absolute right-2 bottom-2 inline-flex items-center gap-0.5 rounded-full bg-stone-900/85 px-2 py-0.5 text-[11px] font-medium text-stone-50 backdrop-blur-sm">
                      <svg
                        className="h-3 w-3 text-amber-300"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {entry.userRating}
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`status-dot ${STATUS_DOT[entry.status]}`} />
                    <span className="text-[11px] font-medium text-stone-500">
                      {STATUS_LABELS[entry.status]}
                    </span>
                  </div>
                  <h3 className="group-hover:text-accent-700 mt-1 line-clamp-2 font-medium text-stone-900 transition-colors">
                    {entry.title}
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-stone-500">{entry.author}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-[var(--radius-lg)] border border-dashed border-stone-300 px-6 py-12 text-center">
            <p className="font-medium text-stone-900">Aucun livre trouvé</p>
            <p className="mt-1 text-sm text-stone-500">
              {genre || trimmedSearch || status
                ? "Essayez un autre filtre ou ajoutez un livre."
                : "Commencez par ajouter votre première lecture."}
            </p>
            <Link href="/books/add" className={buttonClasses("primary", "mt-6")}>
              Ajouter un livre
            </Link>
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
            <PaginationLink
              page={currentPage - 1}
              params={params}
              sort={sortBy}
              disabled={currentPage <= 1}
              label="← Précédent"
            />
            <p className="text-sm text-stone-500">
              Page {currentPage} / {totalPages}
            </p>
            <PaginationLink
              page={currentPage + 1}
              params={params}
              sort={sortBy}
              disabled={currentPage >= totalPages}
              label="Suivant →"
            />
          </nav>
        )}
      </main>
    </>
  );
}

/**
 * Pagination par liens et non via le <Pagination /> de components/ui/ : celui-ci attend un
 * callback `onPageChange`, donc un Client Component, alors que cette page est rendue côté
 * serveur. Des liens gardent aussi l'URL partageable et le clic milieu fonctionnel.
 */
function PaginationLink({
  page,
  params,
  sort,
  disabled,
  label,
}: {
  page: number;
  params: BooksSearchParams;
  sort: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-300">
        {label}
      </span>
    );
  }

  const query = new URLSearchParams({ sort, page: String(page) });
  if (params.genre) query.set("genre", params.genre);
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);

  return (
    <Link
      href={`/books?${query}`}
      className="bg-card rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:shadow-md"
    >
      {label}
    </Link>
  );
}
