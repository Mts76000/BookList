import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { ContributionGraph } from "@/components/ContributionGraph"
import { AddReadingActivity } from "@/components/AddReadingActivity"

async function getDashboardData(userId: string) {
  const books = await prisma.book.findMany({
    where: { userId },
    orderBy: { userEndDate: "desc" },
    take: 5,
  })

  const totalBooks = await prisma.book.count({
    where: { userId },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { initialBooksRead: true },
  })

  const totalPagesRead = await prisma.book.aggregate({
    where: { userId, pageCount: { not: null } },
    _sum: { pageCount: true },
  })

  const readingActivities = await prisma.readingActivity.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  })

  const currentYear = new Date().getFullYear()
  const booksThisYear = await prisma.book.count({
    where: {
      userId,
      userEndDate: {
        gte: new Date(currentYear, 0, 1),
        lte: new Date(currentYear, 11, 31),
      },
    },
  })

  const averageRating = await prisma.book.aggregate({
    where: { userId, userRating: { not: null } },
    _avg: { userRating: true },
  })

  const yearsReading = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })

  return {
    books,
    totalBooks: totalBooks + (user?.initialBooksRead || 0),
    totalPagesRead: totalPagesRead._sum.pageCount || 0,
    readingActivities,
    booksThisYear,
    averageRating: averageRating._avg.userRating || 0,
    memberSince: yearsReading?.createdAt,
  }
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const data = await getDashboardData(session.user.id)
  const firstName = session.user.name?.split(" ")[0] || "Lecteur"

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-8">
          <p className="text-sm font-medium text-stone-500">Bonjour</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {firstName}
          </h1>
          <p className="mt-1 text-stone-500">Votre suivi de lecture</p>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { label: "Livres lus", value: data.totalBooks },
            { label: "Pages lues", value: data.totalPagesRead },
            { label: "Cette année", value: data.booksThisYear },
            {
              label: "Note moyenne",
              value: data.averageRating > 0 ? data.averageRating.toFixed(1) : "—",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5"
            >
              <p className="text-2xl font-semibold tabular-nums text-stone-900 sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-stone-500 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <section className="mb-8 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium text-stone-900">
            Pages lues par jour
          </h2>
          <ContributionGraph activities={data.readingActivities} />
        </section>

        <section className="mb-8">
          <AddReadingActivity />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Lectures récentes</h2>
            <Link
              href="/books"
              className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
            >
              Tout voir
            </Link>
          </div>

          {data.books.length > 0 ? (
            <div className="space-y-3">
              {data.books.map((book) => (
                <Link
                  key={book.id}
                  href={`/books/${book.id}`}
                  className="flex gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 transition hover:border-stone-300"
                >
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="h-20 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                      <BookIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-stone-900">{book.title}</h3>
                    <p className="truncate text-sm text-stone-500">{book.author}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
                      {book.userRating && (
                        <span className="flex items-center gap-1">
                          <StarIcon className="h-3.5 w-3.5 text-amber-500" />
                          {book.userRating}/5
                        </span>
                      )}
                      {(book.userStartDate || book.userEndDate) && (
                        <span>
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
              <BookIcon className="mx-auto h-10 w-10 text-stone-300" />
              <p className="mt-4 font-medium text-stone-900">Aucun livre pour l&apos;instant</p>
              <p className="mt-1 text-sm text-stone-500">
                Ajoutez votre première lecture pour commencer.
              </p>
              <Link
                href="/books/add"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
              >
                Ajouter un livre
              </Link>
            </div>
          )}
        </section>

        <Link
          href="/books/add"
          className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg transition hover:bg-stone-800 sm:bottom-8"
          aria-label="Ajouter un livre"
        >
          <PlusIcon className="h-6 w-6" />
        </Link>
      </main>
    </div>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
