import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { ContributionGraph } from "@/components/ContributionGraph"

async function getDashboardData(userId: string) {
  const books = await prisma.book.findMany({
    where: { userId },
    orderBy: { userReadDate: "desc" },
    take: 5,
  })

  const totalBooks = await prisma.book.count({
    where: { userId },
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
      userReadDate: {
        gte: new Date(currentYear, 0, 1),
        lte: new Date(currentYear, 11, 31),
      },
    },
  })

  const averageRating = await prisma.book.aggregate({
    where: { userId, userRating: { not: null } },
    _avg: { userRating: true },
  })

  return {
    books,
    totalBooks,
    totalPagesRead: totalPagesRead._sum.pageCount || 0,
    readingActivities,
    booksThisYear,
    averageRating: averageRating._avg.userRating || 0,
  }
}

export default async function Dashboard() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const data = await getDashboardData(session.user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour, {session.user.name || "Lecteur"} !
          </h1>
          <p className="text-gray-600 mt-2">Voici votre progression de lecture</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-gray-900">{data.totalBooks}</div>
            <div className="text-sm text-gray-500">Livres lus</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="text-3xl mb-2">📖</div>
            <div className="text-2xl font-bold text-gray-900">{data.totalPagesRead}</div>
            <div className="text-sm text-gray-500">Pages lues</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-2xl font-bold text-gray-900">{data.booksThisYear}</div>
            <div className="text-sm text-gray-500">Livres cette année</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.averageRating.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Note moyenne</div>
          </div>
        </div>

        {/* Contribution Graph */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité de lecture</h2>
          <ContributionGraph activities={data.readingActivities} />
        </div>

        {/* Recent Books */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Livres récents</h2>
            <a
              href="/books"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Voir tout →
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.books.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex gap-4">
                  {book.coverUrl && (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{book.author}</p>
                    {book.userRating && (
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm text-gray-600 ml-1">{book.userRating}/5</span>
                      </div>
                    )}
                    {book.userReadDate && (
                      <p className="text-xs text-gray-400 mt-2">
                        Lu le {new Date(book.userReadDate).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {data.books.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-gray-500">Aucun livre lu pour le moment</p>
                <a
                  href="/books/add"
                  className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Ajouter votre premier livre →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Button */}
        <a
          href="/books/add"
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </a>
      </main>
    </div>
  )
}
