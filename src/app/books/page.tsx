import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Prisma, BookStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { BooksFilter } from "@/components/BooksFilter"
import { BookCover } from "@/components/BookCover"
import { uniqueGenres } from "@/lib/genres"

const BOOKS_PER_PAGE = 12

const STATUS_LABELS: Record<string, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  FINISHED: "Terminé",
}

const STATUS_DOT: Record<string, string> = {
  TO_READ: "bg-stone-400",
  READING: "bg-accent-500",
  FINISHED: "bg-moss-500",
}

async function getBooks(
  userId: string,
  sortBy: string,
  page: number,
  options: { genre?: string; search?: string; status?: string } = {}
) {
  let orderBy: Record<string, string> | Record<string, string>[] = { userEndDate: "desc" }

  switch (sortBy) {
    case "title":
      orderBy = { title: "asc" }
      break
    case "rating":
      orderBy = [{ userRating: "desc" }, { title: "asc" }]
      break
    case "oldest":
      orderBy = { userEndDate: "asc" }
      break
    case "pages":
      orderBy = [{ pageCount: "desc" }, { title: "asc" }]
      break
    default:
      orderBy = { userEndDate: "desc" }
  }

  const where: Prisma.BookWhereInput = { userId }

  if (options.genre) {
    where.genre = { contains: options.genre, mode: "insensitive" }
  }

  if (options.search?.trim()) {
    where.OR = [
      { title: { contains: options.search.trim(), mode: "insensitive" } },
      { author: { contains: options.search.trim(), mode: "insensitive" } },
    ]
  }

  if (options.status && (Object.values(BookStatus) as string[]).includes(options.status)) {
    where.status = options.status as BookStatus
  }

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip: (page - 1) * BOOKS_PER_PAGE,
      take: BOOKS_PER_PAGE,
    }),
    prisma.book.count({ where }),
  ])

  return { books, total, totalPages: Math.ceil(total / BOOKS_PER_PAGE) }
}

async function getGenres(userId: string) {
  const books = await prisma.book.findMany({
    where: { userId, genre: { not: null } },
    select: { genre: true },
  })

  return uniqueGenres(books)
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string
    genre?: string
    page?: string
    search?: string
    status?: string
  }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const params = await searchParams
  const sortBy = params.sort || "date"
  const genre = params.genre
  const search = params.search
  const status = params.status
  const currentPage = Math.max(1, parseInt(params.page || "1", 10))

  const [{ books, total, totalPages }, genres] = await Promise.all([
    getBooks(session.user.id, sortBy, currentPage, { genre, search, status }),
    getGenres(session.user.id),
  ])

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl text-stone-900 sm:text-3xl">Votre étagère</h1>
            <p className="mt-1 text-sm text-stone-500">
              {total} livre{total !== 1 ? "s" : ""} dans votre bibliothèque
            </p>
          </div>
          <Link href="/books/add" className="btn-primary">
            Ajouter un livre
          </Link>
        </div>

        <BooksFilter sortBy={sortBy} genre={genre} status={status} genres={genres} />

        {books.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`} className="group block">
                <div className="relative">
                  <BookCover
                    coverUrl={book.coverUrl}
                    alt={book.title}
                    tactile
                    className="aspect-[2/3] w-full rounded-[--radius-sm]"
                  />
                  {book.userRating && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-0.5 rounded-full bg-stone-900/85 px-2 py-0.5 text-[11px] font-medium text-stone-50 backdrop-blur-sm">
                      <svg className="h-3 w-3 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {book.userRating}
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`status-dot ${STATUS_DOT[book.status]}`} />
                    <span className="text-[11px] font-medium text-stone-500">{STATUS_LABELS[book.status]}</span>
                  </div>
                  <h3 className="mt-1 font-medium text-stone-900 line-clamp-2 transition-colors group-hover:text-accent-700">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-stone-500">{book.author}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[--radius-lg] border border-dashed border-stone-300 bg-(--surface) px-6 py-12 text-center">
            <p className="font-medium text-stone-900">Aucun livre trouvé</p>
            <p className="mt-1 text-sm text-stone-500">
              {genre ? "Essayez un autre filtre ou ajoutez un livre." : "Commencez par ajouter votre première lecture."}
            </p>
            <Link href="/books/add" className="btn-primary mt-6">
              Ajouter un livre
            </Link>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <PaginationLink
              page={currentPage - 1}
              sort={sortBy}
              genre={genre}
              search={search}
              status={status}
              disabled={currentPage <= 1}
              label="← Précédent"
            />
            <p className="text-sm text-stone-500">
              Page {currentPage} / {totalPages}
            </p>
            <PaginationLink
              page={currentPage + 1}
              sort={sortBy}
              genre={genre}
              search={search}
              status={status}
              disabled={currentPage >= totalPages}
              label="Suivant →"
            />
          </div>
        )}
      </main>
    </div>
  )
}

function PaginationLink({
  page,
  sort,
  genre,
  search,
  status,
  disabled,
  label,
}: {
  page: number
  sort: string
  genre?: string
  search?: string
  status?: string
  disabled: boolean
  label: string
}) {
  if (disabled) {
    return (
      <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-300">
        {label}
      </span>
    )
  }

  const query = new URLSearchParams({ sort, page: page.toString() })
  if (genre) query.set("genre", genre)
  if (search) query.set("search", search)
  if (status) query.set("status", status)

  return (
    <Link
      href={`/books?${query.toString()}`}
      className="rounded-full border border-stone-200 bg-(--surface) px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:shadow-md"
    >
      {label}
    </Link>
  )
}
