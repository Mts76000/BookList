"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { parseGenres } from "@/lib/genres";

type BookStatus = "TO_READ" | "READING" | "FINISHED";

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date;
}

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  genre: string | null;
  publishedDate: string | null;
  userRating: number | null;
  userStartDate: string | Date | null;
  userEndDate: string | Date | null;
  status: BookStatus;
  comments: Comment[];
}

interface BookDetailsProps {
  book: Book;
}

/** Au-delà, la description est repliée derrière un « Voir plus ». */
const DESCRIPTION_PREVIEW_LENGTH = 260;

const STATUS_OPTIONS: { value: BookStatus; label: string; activeClass: string }[] = [
  { value: "TO_READ", label: "À lire", activeClass: "bg-stone-800 text-stone-50 shadow-md" },
  { value: "READING", label: "En cours", activeClass: "bg-accent-600 text-stone-50 shadow-md" },
  { value: "FINISHED", label: "Terminé", activeClass: "bg-moss-600 text-stone-50 shadow-md" },
];

const STATUS_LABELS: Record<BookStatus, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  FINISHED: "Terminé",
};

const STATUS_STYLES: Record<BookStatus, string> = {
  TO_READ: "bg-stone-100 text-stone-600",
  READING: "bg-accent-50 text-accent-700",
  FINISHED: "bg-moss-100 text-moss-800",
};

const STATUS_DOT: Record<BookStatus, string> = {
  TO_READ: "bg-stone-400",
  READING: "bg-accent-500",
  FINISHED: "bg-moss-500",
};

/** Formate une date pour un champ `type="date"`, qui n'accepte que `YYYY-MM-DD`. */
function toDateInput(value: string | Date | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value: string | Date | null): string {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "?";
}

export function BookDetails({ book }: BookDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(book.userRating ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editForm, setEditForm] = useState({
    title: book.title,
    author: book.author,
    description: book.description ?? "",
    coverUrl: book.coverUrl ?? "",
    pageCount: book.pageCount?.toString() ?? "",
    genre: book.genre ?? "",
    publishedDate: book.publishedDate ?? "",
    userStartDate: toDateInput(book.userStartDate),
    userEndDate: toDateInput(book.userEndDate),
    status: book.status,
  });

  async function handleAddComment() {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await apiFetch(`/api/books/${book.id}/comments`, {
        method: "POST",
        json: { content: newComment },
      });
      if (!result.ok) {
        toast(result.message, "error");
        return;
      }
      setNewComment("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateRating(newRating: number) {
    // Note appliquée tout de suite : l'aller-retour serveur ne doit pas faire clignoter
    // les étoiles sous le doigt.
    const previousRating = rating;
    setRating(newRating);
    setIsSubmitting(true);
    try {
      const result = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        json: { userRating: newRating },
      });
      if (!result.ok) {
        setRating(previousRating);
        toast(result.message, "error");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    setIsSubmitting(true);
    try {
      const result = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        // Les chaînes vides sont converties en NULL par le schéma Zod : rien à normaliser ici.
        json: {
          title: editForm.title,
          author: editForm.author,
          description: editForm.description,
          coverUrl: editForm.coverUrl,
          pageCount: editForm.pageCount,
          genre: editForm.genre,
          publishedDate: editForm.publishedDate,
          userStartDate: editForm.userStartDate,
          userEndDate: editForm.userEndDate,
          status: editForm.status,
        },
      });
      if (!result.ok) {
        toast(result.message, "error");
        return;
      }
      setIsEditing(false);
      toast("Livre mis à jour.", "success");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await apiFetch(`/api/books/${book.id}`, { method: "DELETE" });
    if (!result.ok) {
      toast(result.message, "error");
      setIsDeleting(false);
      setConfirmDelete(false);
      return;
    }
    router.push("/books");
    router.refresh();
  }

  const description = book.description ?? "";
  const isDescriptionLong = description.length > DESCRIPTION_PREVIEW_LENGTH;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/books"
          className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-stone-900"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>

        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
              aria-label="Modifier le livre"
            >
              <EditIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="hover:bg-destructive/5 hover:text-destructive flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition"
              aria-label="Supprimer le livre"
            >
              <TrashIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="border-destructive/30 bg-destructive/5 mb-4 rounded-2xl border p-4">
          <p className="text-destructive text-sm font-medium">Supprimer ce livre ?</p>
          <p className="text-destructive/80 mt-1 text-sm">
            Cette action est définitive et supprimera aussi vos notes.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
              {isDeleting ? "Suppression…" : "Oui, supprimer"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <article className="card overflow-hidden">
        {isEditing ? (
          <div className="space-y-4 p-5 sm:p-6">
            <h2 className="text-sm font-medium text-stone-900">Modifier le livre</h2>

            <Field
              label="Titre"
              required
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            <Field
              label="Auteur"
              required
              value={editForm.author}
              onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
            />
            <Textarea
              label="Description"
              rows={4}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <Field
              label="Couverture (URL)"
              type="url"
              value={editForm.coverUrl}
              onChange={(e) => setEditForm({ ...editForm, coverUrl: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Pages"
                type="number"
                inputMode="numeric"
                value={editForm.pageCount}
                onChange={(e) => setEditForm({ ...editForm, pageCount: e.target.value })}
              />
              <Field
                label="Genre"
                placeholder="Roman, SF…"
                value={editForm.genre}
                onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
              />
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium tracking-tight text-stone-700">
                Statut
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={editForm.status === option.value}
                    onClick={() => setEditForm({ ...editForm, status: option.value })}
                    className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition ${
                      editForm.status === option.value
                        ? option.activeClass
                        : "bg-card text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <Field
              label="Publié"
              placeholder="2019"
              value={editForm.publishedDate}
              onChange={(e) => setEditForm({ ...editForm, publishedDate: e.target.value })}
            />

            {/* Un livre à lire n'a pas encore de dates de lecture. */}
            {editForm.status !== "TO_READ" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Début"
                  type="date"
                  value={editForm.userStartDate}
                  onChange={(e) => setEditForm({ ...editForm, userStartDate: e.target.value })}
                />
                {editForm.status === "FINISHED" && (
                  <Field
                    label="Fin"
                    type="date"
                    value={editForm.userEndDate}
                    onChange={(e) => setEditForm({ ...editForm, userEndDate: e.target.value })}
                  />
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSaveEdit} isLoading={isSubmitting} className="flex-1">
                {isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:p-6">
            <BookCover
              coverUrl={book.coverUrl}
              alt={book.title}
              className="mx-auto h-56 w-40 shrink-0 rounded-[var(--radius-sm)] sm:mx-0"
              variant="large"
              tactile
            />

            <div className="flex-1">
              <span className={`badge ${STATUS_STYLES[book.status]}`}>
                <span className={`status-dot ${STATUS_DOT[book.status]}`} />
                {STATUS_LABELS[book.status]}
              </span>
              <h1 className="mt-2 font-serif text-xl text-stone-900 sm:text-2xl">{book.title}</h1>
              <p className="mt-1 text-stone-500">{book.author}</p>

              {book.genre && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {parseGenres(book.genre).map((genre) => (
                    <span key={genre} className="badge bg-stone-100 text-stone-600">
                      {genre}
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
                {(book.userStartDate || book.userEndDate) && (
                  <div className="flex gap-2">
                    <dt className="text-stone-400">Lecture</dt>
                    <dd>
                      {formatDate(book.userStartDate)} — {formatDate(book.userEndDate)}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-stone-700">Votre note</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleUpdateRating(star)}
                      disabled={isSubmitting}
                      className="p-0.5 transition disabled:opacity-50"
                      aria-label={`Noter ${star} sur 5`}
                      aria-pressed={star === rating}
                    >
                      <svg
                        className={`h-7 w-7 ${star <= rating ? "text-amber-500" : "text-stone-200"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
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
                      type="button"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-stone-900 transition hover:opacity-70"
                    >
                      {isDescriptionExpanded ? "Voir moins" : "Voir plus"}
                      <ChevronIcon
                        className={`h-4 w-4 transition-transform ${isDescriptionExpanded ? "rotate-180" : ""}`}
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
          <h2 className="font-serif text-lg text-stone-900">Notes personnelles</h2>
          <p className="mt-1 text-sm text-stone-500">
            Optionnel — conservez ici vos réflexions sur ce livre. Votre note est déjà enregistrée.
          </p>

          <div className="mt-4">
            <Textarea
              label="Nouvelle note"
              hideLabel
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Réflexions, citations, impressions…"
            />
            <div className="mt-2 flex justify-end">
              <Button
                onClick={handleAddComment}
                isLoading={isSubmitting}
                disabled={!newComment.trim()}
              >
                {isSubmitting ? "Ajout…" : "Ajouter une note"}
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {book.comments.length > 0 ? (
              book.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-t border-stone-100 pt-4 first:border-0 first:pt-0"
                >
                  <time className="text-xs text-stone-400">{formatDate(comment.createdAt)}</time>
                  <p className="mt-1.5 text-sm text-stone-600">{comment.content}</p>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-stone-400">Aucune note pour le moment</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 12v6.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75V6.75A2.25 2.25 0 015.25 4.5h6.75"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
