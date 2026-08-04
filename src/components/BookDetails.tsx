"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
}

export function BookDetails({ book }: BookDetailsProps) {
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

      if (!response.ok) throw new Error("Failed")

      setNewComment("")
      router.refresh()
    } catch {
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

      if (!response.ok) throw new Error("Failed")

      setRating(newRating)
      router.refresh()
    } catch {
      setError("Erreur lors de la mise à jour de la note")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <Link
        href="/books"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-stone-900"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </Link>

      <article className="card overflow-hidden">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:p-6">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt=""
              className="mx-auto h-56 w-40 shrink-0 rounded-xl object-cover sm:mx-0"
            />
          ) : (
            <div className="mx-auto flex h-56 w-40 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-300 sm:mx-0">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">{book.title}</h1>
            <p className="mt-1 text-stone-500">{book.author}</p>

            {book.genre && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {book.genre.split(",").map((g) => (
                  <span
                    key={g.trim()}
                    className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>
            )}

            <dl className="mt-4 space-y-1 text-sm text-stone-500">
              {book.pageCount && (
                <div className="flex gap-2">
                  <dt className="text-stone-400">Pages</dt>
                  <dd>{book.pageCount}</dd>
                </div>
              )}
              {book.publishedDate && (
                <div className="flex gap-2">
                  <dt className="text-stone-400">Publié</dt>
                  <dd>{book.publishedDate}</dd>
                </div>
              )}
              {book.userReadDate && (
                <div className="flex gap-2">
                  <dt className="text-stone-400">Lu le</dt>
                  <dd>{new Date(book.userReadDate).toLocaleDateString("fr-FR")}</dd>
                </div>
              )}
            </dl>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-stone-700">Votre note</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleUpdateRating(star)}
                    disabled={isSubmitting}
                    className="p-0.5 transition disabled:opacity-50"
                    aria-label={`Noter ${star} sur 5`}
                  >
                    <svg
                      className={`h-7 w-7 ${star <= rating ? "text-amber-400" : "text-stone-200"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {book.description && (
              <div className="mt-5 border-t border-stone-100 pt-5">
                <p className="text-sm leading-relaxed text-stone-600 line-clamp-3">{book.description}</p>
              </div>
            )}
          </div>
        </div>
      </article>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900">Commentaires</h2>

        <div className="mt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Votre avis personnel..."
            rows={3}
            className="input-field resize-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || !newComment.trim()}
              className="btn-primary px-4 py-2"
            >
              {isSubmitting ? "Envoi..." : "Publier"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {book.comments.length > 0 ? (
            book.comments.map((comment) => (
              <div key={comment.id} className="border-t border-stone-100 pt-4 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-900">
                    {comment.user.name || "Moi"}
                  </span>
                  <time className="text-xs text-stone-400">
                    {new Date(comment.createdAt).toLocaleDateString("fr-FR")}
                  </time>
                </div>
                <p className="mt-1.5 text-sm text-stone-600">{comment.content}</p>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-stone-400">
              Aucun commentaire pour le moment
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
