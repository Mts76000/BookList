"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretLeft, PencilSimple, Trash } from "@phosphor-icons/react";
import { BookCover } from "@/components/book-cover";
import { Button, buttonClasses } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { parseGenres } from "@/lib/genres";
import {
  FORMAT_LABELS,
  STATUS_BADGE,
  STATUS_DOT,
  STATUS_LABELS,
  isBookFormat,
  type BookStatus,
} from "@/lib/book-status";
import { ReadingProgress } from "@/components/reading-progress";
import { StarRating } from "@/components/star-rating";
import { libraryReturnUrl } from "@/components/library-scroll";

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
  currentPage: number | null;
  format: string | null;
  seriesName: string | null;
  seriesIndex: number | null;
  seriesTotal: number | null;
  comments: Comment[];
}

interface BookDetailsProps {
  book: Book;
}

/** Au-delà, la description est repliée derrière un « Voir plus ». */
const DESCRIPTION_PREVIEW_LENGTH = 260;

function formatDate(value: string | Date | null): string {
  return value
    ? new Date(value).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "?";
}

export function BookDetails({ book }: BookDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(book.userRating ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  /** Retour à l'étagère telle qu'on l'a quittée, sinon à la page précédente. */
  function goBack(e: React.MouseEvent) {
    e.preventDefault();
    const libraryUrl = libraryReturnUrl();
    if (libraryUrl) router.push(libraryUrl, { scroll: false });
    else if (window.history.length > 1) router.back();
    else router.push("/books");
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
  const genres = book.genre ? parseGenres(book.genre) : [];
  const facts = [
    book.pageCount ? `${book.pageCount} pages` : null,
    book.publishedDate ? `Paru en ${book.publishedDate}` : null,
    isBookFormat(book.format) ? FORMAT_LABELS[book.format] : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/books"
          onClick={goBack}
          className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-stone-500 transition hover:text-stone-900"
        >
          <CaretLeft className="h-4 w-4" aria-hidden="true" />
          Retour
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href={`/books/${book.id}/edit`}
            className={buttonClasses("secondary", "min-h-10 px-4 py-2")}
          >
            <PencilSimple className="h-4 w-4" aria-hidden="true" />
            Modifier
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="hover:bg-destructive/5 hover:text-destructive flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-stone-500 transition"
            aria-label="Supprimer le livre"
          >
            <Trash className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="border-destructive/30 bg-destructive/5 mb-4 rounded-[var(--radius-md)] border p-4">
          <p className="text-destructive text-sm font-medium">Supprimer ce livre ?</p>
          <p className="text-destructive/80 mt-1 text-sm">
            Cette action est définitive et supprimera aussi vos notes et citations.
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
        <div className="from-accent-50/70 flex flex-col items-center gap-6 bg-gradient-to-b to-transparent p-5 pt-8 text-center sm:flex-row sm:items-start sm:p-8 sm:text-left">
          <BookCover
            coverUrl={book.coverUrl}
            alt={book.title}
            author={book.author}
            className="aspect-[2/3] w-36 shrink-0 rounded-[var(--radius-sm)] sm:w-44"
            variant="large"
            tactile
          />

          <div className="min-w-0 flex-1">
            <span className={`badge ${STATUS_BADGE[book.status]}`}>
              <span className={`status-dot ${STATUS_DOT[book.status]}`} />
              {STATUS_LABELS[book.status]}
            </span>
            <h1 className="mt-3 font-serif text-2xl leading-tight text-balance text-stone-900 sm:text-3xl">
              {book.title}
            </h1>
            <p className="mt-1 text-stone-600">{book.author}</p>
            {book.seriesName && (
              <Link
                href="/books/sagas"
                className="text-accent-700 mt-2 inline-block text-sm font-medium hover:underline"
              >
                {book.seriesName}
                {book.seriesIndex !== null &&
                  `, tome ${book.seriesIndex}${book.seriesTotal ? ` sur ${book.seriesTotal}` : ""}`}
              </Link>
            )}

            {(facts.length > 0 || genres.length > 0) && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {facts.map((fact) => (
                  <span key={fact} className="badge border border-stone-200 text-stone-600">
                    {fact}
                  </span>
                ))}
                {genres.map((genre) => (
                  <span key={genre} className="badge bg-stone-100 text-stone-600">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {(book.userStartDate || book.userEndDate) && (
              <p className="mt-3 text-sm text-stone-500">
                {book.userEndDate
                  ? `Lu du ${formatDate(book.userStartDate)} au ${formatDate(book.userEndDate)}`
                  : `Commencé le ${formatDate(book.userStartDate)}`}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6 border-t border-stone-100 p-5 sm:p-8">
          {(book.status === "READING" || book.status === "TO_READ") && (
            <ReadingProgress
              bookId={book.id}
              currentPage={book.currentPage}
              pageCount={book.pageCount}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-stone-700">Votre note</p>
            <StarRating
              value={rating}
              onChange={(value) => void handleUpdateRating(value)}
              disabled={isSubmitting}
            />
          </div>

          {description && (
            <div className="border-t border-stone-100 pt-6">
              <h2 className="text-sm font-medium text-stone-700">Résumé</h2>
              <p
                className={`mt-2 text-sm leading-relaxed whitespace-pre-line text-stone-600 ${
                  !isDescriptionExpanded && isDescriptionLong ? "line-clamp-4" : ""
                }`}
              >
                {description}
              </p>
              {isDescriptionLong && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-stone-900 transition hover:opacity-70"
                >
                  {isDescriptionExpanded ? "Voir moins" : "Lire la suite"}
                  <ChevronIcon
                    className={`h-4 w-4 transition-transform ${isDescriptionExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </article>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-lg text-stone-900">Vos notes</h2>
        <p className="mt-1 text-sm text-stone-500">Vos impressions, pour vous seul.</p>

        <div className="mt-4">
          <Textarea
            label="Nouvelle note"
            hideLabel
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ce que vous en avez pensé…"
          />
          <div className="mt-2 flex justify-end">
            <Button
              onClick={handleAddComment}
              isLoading={isSubmitting}
              disabled={!newComment.trim()}
            >
              {isSubmitting ? "Ajout…" : "Ajouter la note"}
            </Button>
          </div>
        </div>

        {book.comments.length > 0 && (
          <div className="mt-6 space-y-4">
            {book.comments.map((comment) => (
              <div
                key={comment.id}
                className="border-t border-stone-100 pt-4 first:border-0 first:pt-0"
              >
                <time className="text-xs text-stone-400">{formatDate(comment.createdAt)}</time>
                <p className="mt-1.5 text-sm whitespace-pre-line text-stone-600">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
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
