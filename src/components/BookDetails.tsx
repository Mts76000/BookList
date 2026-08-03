"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Comment {
  id: string
  content: string
  createdAt: Date
  user: {
    name: string | null
  }
}

interface Book {
  id: string
  title: string
  author: string
  description: string | null
  coverUrl: string | null
  pageCount: number | null
  genre: string | null
  publishedDate: string | null
  userRating: number | null
  userReadDate: Date | null
  comments: Comment[]
}

interface BookDetailsProps {
  book: Book
  userId: string
}

export function BookDetails({ book, userId }: BookDetailsProps) {
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [rating, setRating] = useState(book.userRating || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/books/${book.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      })

      if (!response.ok) {
        throw new Error("Failed to add comment")
      }

      setNewComment("")
      router.refresh()
    } catch (error) {
      setError("Erreur lors de l'ajout du commentaire")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRating = async (newRating: number) => {
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRating: newRating }),
      })

      if (!response.ok) {
        throw new Error("Failed to update rating")
      }

      setRating(newRating)
      router.refresh()
    } catch (error) {
      setError("Erreur lors de la mise à jour de la note")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Back button */}
      <a
        href="/books"
        className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux livres
      </a>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-6 p-6">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full sm:w-48 h-72 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full sm:w-48 h-72 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-6xl">📖</span>
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{book.title}</h1>
            <p className="text-lg text-gray-600 mb-4">{book.author}</p>

            {book.genre && (
              <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full mb-4">
                {book.genre}
              </span>
            )}

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              {book.pageCount && <p>📖 {book.pageCount} pages</p>}
              {book.publishedDate && <p>📅 Publié le {book.publishedDate}</p>}
              {book.userReadDate && (
                <p>✅ Lu le {new Date(book.userReadDate).toLocaleDateString("fr-FR")}</p>
              )}
            </div>

            {/* Rating */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Votre note</h3>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleUpdateRating(star)}
                    disabled={isSubmitting}
                    className={`text-2xl transition ${
                      star <= rating ? "text-yellow-500" : "text-gray-300 hover:text-gray-400"
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {book.description && (
              <div className="prose prose-sm max-w-none">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600">{book.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Commentaires</h2>

        {/* Add Comment Form */}
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Écrivez votre commentaire..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || !newComment.trim()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Envoi..." : "Ajouter"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Comments List */}
        {book.comments.length > 0 ? (
          <div className="space-y-4">
            {book.comments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {comment.user.name || "Anonyme"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="text-gray-600">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Aucun commentaire pour le moment</p>
        )}
      </div>
    </div>
  )
}
