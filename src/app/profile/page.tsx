import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { ProfileView } from "@/components/ProfileView"

async function getProfileData(userId: string) {
  const [user, totalBooks, totalPagesRead, averageRating, commentsCount, topAuthor, booksForStats] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, initialBooksRead: true, createdAt: true },
      }),
      prisma.book.count({ where: { userId } }),
      prisma.book.aggregate({
        where: { userId, pageCount: { not: null } },
        _sum: { pageCount: true },
      }),
      prisma.book.aggregate({
        where: { userId, userRating: { not: null } },
        _avg: { userRating: true },
      }),
      prisma.comment.count({ where: { userId } }),
      prisma.book.groupBy({
        by: ["author"],
        where: { userId },
        _count: { author: true },
        orderBy: { _count: { author: "desc" } },
        take: 1,
      }),
      prisma.book.findMany({
        where: { userId },
        select: {
          pageCount: true,
          userEndDate: true,
          genre: true,
        },
      }),
    ])

  const genreCounts = new Map<string, number>()
  const pagesByYear = new Map<number, number>()

  for (const book of booksForStats) {
    if (book.pageCount && book.userEndDate) {
      const year = new Date(book.userEndDate).getFullYear()
      pagesByYear.set(year, (pagesByYear.get(year) || 0) + book.pageCount)
    }

    if (book.genre) {
      for (const g of book.genre.split(",")) {
        const trimmed = g.trim()
        if (trimmed) {
          genreCounts.set(trimmed, (genreCounts.get(trimmed) || 0) + 1)
        }
      }
    }
  }

  const favoriteGenre = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  const pagesPerYear = Array.from(pagesByYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, pages]) => ({ year, pages }))

  return {
    user,
    totalBooks: totalBooks + (user?.initialBooksRead || 0),
    totalPagesRead: totalPagesRead._sum.pageCount || 0,
    averageRating: averageRating._avg.userRating || 0,
    commentsCount,
    topAuthor: topAuthor[0]?.author || null,
    topAuthorCount: topAuthor[0]?._count.author || 0,
    favoriteGenre,
    pagesPerYear,
  }
}

export default async function Profile() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const data = await getProfileData(session.user.id)

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main className="animate-fade-in-up mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Profil</h1>
          <p className="mt-1 text-sm text-stone-500">Votre compte et vos statistiques</p>
        </header>
        <ProfileView
          name={data.user?.name || null}
          email={data.user?.email || session.user.email || ""}
          memberSince={data.user?.createdAt || null}
          initialBooksRead={data.user?.initialBooksRead || 0}
          totalBooks={data.totalBooks}
          totalPagesRead={data.totalPagesRead}
          averageRating={data.averageRating}
          commentsCount={data.commentsCount}
          topAuthor={data.topAuthor}
          topAuthorCount={data.topAuthorCount}
          favoriteGenre={data.favoriteGenre}
          pagesPerYear={data.pagesPerYear}
        />
      </main>
    </div>
  )
}
