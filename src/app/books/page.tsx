import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"

async function getBooks(userId: string, sortBy: string = "date") {
  let orderBy: any = {}

  switch (sortBy) {
    case "title":
      orderBy = { title: "asc" }
      break
    case "rating":
      orderBy = [{ userRating: "desc" }, { title: "asc" }]
      break
    case "date":
    default:
      orderBy = { userReadDate: "desc" }
      break
  }

  return prisma.book.findMany({
    where: { userId },
    orderBy,
  })
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: { sort?: string }
}) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const sortBy = searchParams.sort || "date"
  const books = await getBooks(session.user.id, sortBy)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes livres</h1>
            <p className="text-gray-600 mt-2">{books.length} livre(s) dans votre collection</p>
          </div>
          <a
            href="/books/add"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un livre
          </a>
        </div>

        {/* Sort Options */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center mr-2">Trier par :</span>
            <a
              href="/books?sort=date"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                sortBy === "date"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Date de lecture
            </a>
            <a
              href="/books?sort=title"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                sortBy === "title"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Titre
            </a>
            <a
              href="/books?sort=rating"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                sortBy === "rating"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Note
            </a>
          </div>
        </div>

        {/* Books Grid */}
        {books.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <a
                key={book.id}
                href={`/books/${book.id}`}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition block"
              >
                <div className="flex gap-4">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-20 h-28 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">📖</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{book.author}</p>
                    {book.genre && (
                      <span className="inline-block mt-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                        {book.genre}
                      </span>
                    )}
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
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun livre</h2>
            <p className="text-gray-500 mb-6">Commencez par ajouter votre premier livre</p>
            <a
              href="/books/add"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Ajouter un livre
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
