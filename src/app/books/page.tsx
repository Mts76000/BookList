import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"

async function getBooks(userId: string, sortBy: string, genre?: string) {
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

  const where: { userId: string; genre?: { contains: string; mode: "insensitive" } } = { userId }
  if (genre) {
    where.genre = { contains: genre, mode: "insensitive" }
  }

  return prisma.book.findMany({ where, orderBy })
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
  searchParams: Promise<{ sort?: string; genre?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const params = await searchParams
  const sortBy = params.sort || "date"
  const genre = params.genre

  const [books, genres] = await Promise.all([
    getBooks(session.user.id, sortBy, genre),
    getGenres(session.user.id),
  ])

  const sortOptions = [
    { value: "date", label: "Plus récents" },
    { value: "oldest", label: "Plus anciens" },
    { value: "title", label: "Titre" },
    { value: "rating", label: "Mieux notés" },
    { value: "pages", label: "Plus longs" },
  ]

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Mes livres</h1>
            <p className="mt-1 text-sm text-stone-500">
              {books.length} livre{books.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/books/add" className="btn-primary">
            Ajouter un livre
          </Link>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                href={`/books?sort=${option.value}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  sortBy === option.value
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/books?sort=${sortBy}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  !genre
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                }`}
              >
                Tous genres
              </Link>
              {genres.map((g) => (
                <Link
                  key={g}
                  href={`/books?sort=${sortBy}&genre=${encodeURIComponent(g)}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    genre === g
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                  }`}
                >
                  {g}
                </Link>
              ))}
            </div>
          )}
        </div>

        {books.length > 0 ? (
          <div className="space-y-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="flex gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 transition hover:border-stone-300"
              >
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt=""
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
                    {book.genre && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        {book.genre.split(",")[0].trim()}
                      </span>
                    )}
                    {book.userRating && (
                      <span className="text-xs text-amber-600">{book.userRating}/5</span>
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
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
            <p className="font-medium text-stone-900">Aucun livre trouvé</p>
            <p className="mt-1 text-sm text-stone-500">
              {genre ? "Essayez un autre filtre ou ajoutez un livre." : "Commencez par ajouter votre première lecture."}
            </p>
            <Link href="/books/add" className="btn-primary mt-6">
              Ajouter un livre
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
