import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Prisma, BookStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { BooksFilter } from "@/components/BooksFilter"

const BOOKS_PER_PAGE = 12

const STATUS_LABELS: Record<string, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  FINISHED: "Terminé",
}

const STATUS_STYLES: Record<string, string> = {
  TO_READ: "bg-stone-100 text-stone-600",
  READING: "bg-blue-100 text-blue-700",
  FINISHED: "bg-emerald-100 text-emerald-800",
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

  const genres = new Set<string>()
  books.forEach((book) => {
    book.genre?.split(",").forEach((g) => {
      const trimmed = g.trim()
      if (trimmed) genres.add(trimmed)
    })
  })

  return Array.from(genres).sort()
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
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Mes livres</h1>
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
          <div className="space-y-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="card card-interactive flex gap-4 p-4"
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl.replace(/^http:/, "https:")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-24 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-stone-900 line-clamp-2">{book.title}</h3>
                  <p className="mt-0.5 text-sm text-stone-500">{book.author}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[book.status]}`}
                    >
                      {STATUS_LABELS[book.status]}
                    </span>
                    {book.genre && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        {book.genre.split(",")[0].trim()}
                      </span>
                    )}
                    {book.userRating && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
                        <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {book.userRating}/5
                      </span>
                    )}
                    {book.pageCount && (
                      <span className="text-xs text-stone-400">{book.pageCount} p.</span>
                    )}
                    {(book.userStartDate || book.userEndDate) && (
                      <span className="text-xs text-stone-400">
                        {book.userStartDate
                          ? new Date(book.userStartDate).toLocaleDateString("fr-FR")
                          : "?"}
                        {" — "}
                        {book.userEndDate
                          ? new Date(book.userEndDate).toLocaleDateString("fr-FR")
                          : "?"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
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
      className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:shadow-md"
    >
      {label}
    </Link>
  )
}
