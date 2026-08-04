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
    userReadDate: new Date().toISOString().split("T")[0],
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery && !isbnQuery) return

    setIsLoading(true)
    setError("")
    setSearchResults([])

    try {
      const params = new URLSearchParams()
      if (isbnQuery) params.append("isbn", isbnQuery)
      else params.append("q", searchQuery)

      const response = await fetch(`/api/books/search?${params}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setSearchResults(data.books || [])
      if (data.books?.length === 0) {
        setError("Aucun résultat. Essayez une autre recherche ou saisissez manuellement.")
      }
    } catch {
      setError("Erreur lors de la recherche")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddBook = async () => {
    setIsLoading(true)
    setError("")

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
          isbn: manualBook.isbn || null,
          description: manualBook.description || null,
          coverUrl: manualBook.coverUrl || null,
          pageCount: manualBook.pageCount ? parseInt(manualBook.pageCount) : null,
          genre: manualBook.genre || null,
          publishedDate: manualBook.publishedDate || null,
          userRating: manualBook.userRating ? parseInt(manualBook.userRating) : null,
          userReadDate: manualBook.userReadDate || null,
        }

    if (!bookData.title || !bookData.author) {
      setError("Le titre et l'auteur sont requis")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookData),
      })

      if (!response.ok) throw new Error("Failed")

      router.push("/books")
    } catch {
      setError("Erreur lors de l'ajout du livre")
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setSelectedBook(null)
    setManualMode(false)
    setSearchResults([])
    setError("")
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8">
      <Navigation />
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900">
          Ajouter un livre
        </h1>

        {!manualMode && !selectedBook && (
          <div className="card p-5 sm:p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Titre ou auteur
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Le Petit Prince"
                  className="input-field"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-stone-400">ou</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">ISBN</label>
                <input
                  type="text"
                  value={isbnQuery}
                  onChange={(e) => setIsbnQuery(e.target.value)}
                  placeholder="978-2070612758"
                  className="input-field"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? "Recherche..." : "Rechercher"}
              </button>
            </form>

            {error && !searchResults.length && (
              <p className="mt-4 text-center text-sm text-stone-500">{error}</p>
            )}

            <button
              onClick={() => setManualMode(true)}
              className="mt-4 w-full text-center text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              Saisir manuellement
            </button>
          </div>
        )}

        {searchResults.length > 0 && !selectedBook && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-stone-500">{searchResults.length} résultat(s)</p>
            {searchResults.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="card flex w-full gap-3 p-3 text-left transition hover:border-stone-300"
              >
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" className="h-20 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-300">
                    ?
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 line-clamp-2">{book.title}</p>
                  <p className="text-sm text-stone-500">{book.authors.join(", ")}</p>
                  {book.pageCount && (
                    <p className="mt-1 text-xs text-stone-400">{book.pageCount} pages</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {(selectedBook || manualMode) && (
          <div className="card p-5 sm:p-6">
            <h2 className="font-medium text-stone-900">
              {selectedBook ? "Confirmer" : "Saisie manuelle"}
            </h2>

            {selectedBook && (
              <div className="mt-4 flex gap-3 rounded-xl bg-stone-50 p-3">
                {selectedBook.coverUrl && (
                  <img src={selectedBook.coverUrl} alt="" className="h-24 w-16 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-medium text-stone-900">{selectedBook.title}</p>
                  <p className="text-sm text-stone-500">{selectedBook.authors.join(", ")}</p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-4">
              {manualMode && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Titre *</label>
                    <input
                      type="text"
                      value={manualBook.title}
                      onChange={(e) => setManualBook({ ...manualBook, title: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Auteur *</label>
                    <input
                      type="text"
                      value={manualBook.author}
                      onChange={(e) => setManualBook({ ...manualBook, author: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-stone-700">Pages</label>
                      <input
                        type="number"
                        value={manualBook.pageCount}
                        onChange={(e) => setManualBook({ ...manualBook, pageCount: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-stone-700">Genre</label>
                      <input
                        type="text"
                        value={manualBook.genre}
                        onChange={(e) => setManualBook({ ...manualBook, genre: e.target.value })}
                        className="input-field"
                        placeholder="Roman, SF..."
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Note</label>
                  <select
                    value={manualBook.userRating}
                    onChange={(e) => setManualBook({ ...manualBook, userRating: e.target.value })}
                    className="input-field"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}/5</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Date de lecture</label>
                  <input
                    type="date"
                    value={manualBook.userReadDate}
                    onChange={(e) => setManualBook({ ...manualBook, userReadDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddBook}
                  disabled={isLoading}
                  className="btn-primary flex-1"
                >
                  {isLoading ? "Ajout..." : "Ajouter"}
                </button>
                <button onClick={reset} className="btn-secondary">
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
