"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/Navigation"

interface BookSearchResult {
  id: string
  title: string
  authors: string[]
  description: string | null
  coverUrl: string | null
  pageCount: number | null
  publishedDate: string | null
  isbn: string | null
  genres: string[] | null
}

export default function AddBook() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isbnQuery, setIsbnQuery] = useState("")
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([])
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [manualMode, setManualMode] = useState(false)

  const [manualBook, setManualBook] = useState({
    title: "",
    author: "",
    isbn: "",
    description: "",
    coverUrl: "",
    pageCount: "",
    genre: "",
    publishedDate: "",
    userRating: "",
    userReadDate: "",
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery && !isbnQuery) return

    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (isbnQuery) {
        params.append("isbn", isbnQuery)
      } else {
        params.append("q", searchQuery)
      }

      const response = await fetch(`/api/books/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Search failed")
      }

      setSearchResults(data.books || [])
    } catch (error) {
      setError("Erreur lors de la recherche")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBook = (book: BookSearchResult) => {
    setSelectedBook(book)
    setManualMode(false)
  }

  const handleAddBook = async () => {
    const bookData = selectedBook
      ? {
          title: selectedBook.title,
          author: selectedBook.authors.join(", "),
          isbn: selectedBook.isbn,
          description: selectedBook.description,
          coverUrl: selectedBook.coverUrl,
          pageCount: selectedBook.pageCount,
          genre: selectedBook.genres?.join(", "),
          publishedDate: selectedBook.publishedDate,
          userRating: manualBook.userRating ? parseInt(manualBook.userRating) : null,
          userReadDate: manualBook.userReadDate || null,
        }
      : {
          title: manualBook.title,
          author: manualBook.author,
          isbn: manualBook.isbn,
          description: manualBook.description,
          coverUrl: manualBook.coverUrl,
          pageCount: manualBook.pageCount ? parseInt(manualBook.pageCount) : null,
          genre: manualBook.genre,
          publishedDate: manualBook.publishedDate,
          userRating: manualBook.userRating ? parseInt(manualBook.userRating) : null,
          userReadDate: manualBook.userReadDate || null,
        }

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookData),
      })

      if (!response.ok) {
        throw new Error("Failed to add book")
      }

      router.push("/books")
    } catch (error) {
      setError("Erreur lors de l'ajout du livre")
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Ajouter un livre</h1>

        {/* Search Section */}
        {!manualMode && !selectedBook && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rechercher un livre</h2>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Par titre/auteur
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Harry Potter, J.K. Rowling"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="text-center text-gray-500">ou</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Par ISBN
                </label>
                <input
                  type="text"
                  value={isbnQuery}
                  onChange={(e) => setIsbnQuery(e.target.value)}
                  placeholder="Ex: 978-2070612360"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? "Recherche..." : "Rechercher"}
              </button>
            </form>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setManualMode(true)}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Saisir manuellement →
              </button>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && !selectedBook && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Résultats</h2>
            <div className="space-y-4">
              {searchResults.map((book) => (
                <div
                  key={book.id}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => handleSelectBook(book)}
                >
                  {book.coverUrl && (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{book.title}</h3>
                    <p className="text-sm text-gray-500">{book.authors.join(", ")}</p>
                    {book.pageCount && (
                      <p className="text-xs text-gray-400 mt-1">{book.pageCount} pages</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Book or Manual Entry */}
        {(selectedBook || manualMode) && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedBook ? "Confirmer le livre" : "Saisie manuelle"}
            </h2>

            <div className="space-y-4">
              {selectedBook && (
                <div className="flex gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                  {selectedBook.coverUrl && (
                    <img
                      src={selectedBook.coverUrl}
                      alt={selectedBook.title}
                      className="w-20 h-28 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedBook.title}</h3>
                    <p className="text-sm text-gray-500">{selectedBook.authors.join(", ")}</p>
                    {selectedBook.pageCount && (
                      <p className="text-xs text-gray-400 mt-1">{selectedBook.pageCount} pages</p>
                    )}
                  </div>
                </div>
              )}

              {manualMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre *
                    </label>
                    <input
                      type="text"
                      value={manualBook.title}
                      onChange={(e) => setManualBook({ ...manualBook, title: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auteur *
                    </label>
                    <input
                      type="text"
                      value={manualBook.author}
                      onChange={(e) => setManualBook({ ...manualBook, author: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ISBN
                    </label>
                    <input
                      type="text"
                      value={manualBook.isbn}
                      onChange={(e) => setManualBook({ ...manualBook, isbn: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de pages
                    </label>
                    <input
                      type="number"
                      value={manualBook.pageCount}
                      onChange={(e) => setManualBook({ ...manualBook, pageCount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Genre
                    </label>
                    <input
                      type="text"
                      value={manualBook.genre}
                      onChange={(e) => setManualBook({ ...manualBook, genre: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de couverture
                    </label>
                    <input
                      type="url"
                      value={manualBook.coverUrl}
                      onChange={(e) => setManualBook({ ...manualBook, coverUrl: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre note (1-5)
                </label>
                <select
                  value={manualBook.userRating}
                  onChange={(e) => setManualBook({ ...manualBook, userRating: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Non noté</option>
                  <option value="1">1 ⭐</option>
                  <option value="2">2 ⭐⭐</option>
                  <option value="3">3 ⭐⭐⭐</option>
                  <option value="4">4 ⭐⭐⭐⭐</option>
                  <option value="5">5 ⭐⭐⭐⭐⭐</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de lecture
                </label>
                <input
                  type="date"
                  value={manualBook.userReadDate}
                  onChange={(e) => setManualBook({ ...manualBook, userReadDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleAddBook}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Ajouter le livre
                </button>
                <button
                  onClick={() => {
                    setSelectedBook(null)
                    setManualMode(false)
                    setSearchResults([])
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
