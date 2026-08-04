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

const DESCRIPTION_PREVIEW_LENGTH = 260

export function BookDetails({ book }: BookDetailsProps) {
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [rating, setRating] = useState(book.userRating || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [editForm, setEditForm] = useState({
    title: book.title,
    author: book.author,
    description: book.description || "",
    coverUrl: book.coverUrl || "",
    pageCount: book.pageCount?.toString() || "",
    genre: book.genre || "",
    publishedDate: book.publishedDate || "",
    userReadDate: book.userReadDate
      ? new Date(book.userReadDate).toISOString().split("T")[0]
      : "",
  })

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

  const handleSaveEdit = async () => {
    if (!editForm.title.trim() || !editForm.author.trim()) {
      setError("Le titre et l'auteur sont requis")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          author: editForm.author,
          description: editForm.description || null,
          coverUrl: editForm.coverUrl || null,
          pageCount: editForm.pageCount ? parseInt(editForm.pageCount) : null,
          genre: editForm.genre || null,
          publishedDate: editForm.publishedDate || null,
          userReadDate: editForm.userReadDate || null,
        }),
      })

      if (!response.ok) throw new Error("Failed")

      setIsEditing(false)
      router.refresh()
    } catch {
      setError("Erreur lors de la mise à jour du livre")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError("")

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed")

      router.push("/books")
      router.refresh()
    } catch {
      setError("Erreur lors de la suppression du livre")
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  const description = book.description || ""
  const isDescriptionLong = description.length > DESCRIPTION_PREVIEW_LENGTH

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/books"
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-stone-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>

        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setError("")
                setIsEditing(true)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
              aria-label="Modifier le livre"
            >
              <EditIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Supprimer le livre"
            >
              <TrashIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Supprimer ce livre ?</p>
          <p className="mt-1 text-sm text-red-600">
            Cette action est définitive et supprimera aussi vos commentaires.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Suppression..." : "Oui, supprimer"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <article className="card overflow-hidden">
        {isEditing ? (
          <div className="space-y-4 p-5 sm:p-6">
            <h2 className="text-sm font-medium text-stone-900">Modifier le livre</h2>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Titre *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Auteur *</label>
              <input
                type="text"
                value={editForm.author}
                onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="input-field resize-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Couverture (URL)</label>
              <input
                type="url"
                value={editForm.coverUrl}
                onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Pages</label>
                <input
                  type="number"
                  value={editForm.pageCount}
                  onChange={(e) => setEditForm({ ...editForm, pageCount: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Genre</label>
                <input
                  type="text"
                  value={editForm.genre}
                  onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                  className="input-field"
                  placeholder="Roman, SF..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Publié</label>
                <input
                  type="text"
                  value={editForm.publishedDate}
                  onChange={(e) => setEditForm({ ...editForm, publishedDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Lu le</label>
                <input
                  type="date"
                  value={editForm.userReadDate}
                  onChange={(e) => setEditForm({ ...editForm, userReadDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="btn-primary flex-1"
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setError("")
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
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

              {description && (
                <div className="mt-5 border-t border-stone-100 pt-5">
                  <p
                    className={`text-sm leading-relaxed text-stone-600 ${
                      !isDescriptionExpanded && isDescriptionLong ? "line-clamp-3" : ""
                    }`}
                  >
                    {description}
                  </p>
                  {isDescriptionLong && (
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-stone-900 hover:underline"
                    >
                      {isDescriptionExpanded ? "Voir moins" : "Voir plus"}
                      <ChevronIcon
                        className={`h-4 w-4 transition-transform ${
                          isDescriptionExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </article>

      {!isEditing && (
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
      )}
    </div>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12v6.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75V6.75A2.25 2.25 0 015.25 4.5h6.75" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
