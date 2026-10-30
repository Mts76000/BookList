"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShareNetwork, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { shareOrDownloadImage } from "@/lib/share-image";

export interface QuoteItem {
  id: string;
  content: string;
  page: number | null;
}

interface BookQuotesProps {
  bookId: string;
  bookTitle: string;
  quotes: QuoteItem[];
  isPremium: boolean;
}

/** Actions sur une citation : image à partager (Premium) et suppression. */
export function QuoteActions({
  quote,
  bookTitle,
  isPremium,
}: {
  quote: QuoteItem;
  bookTitle: string;
  isPremium: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  async function handleShare() {
    setIsBusy(true);
    const ok = await shareOrDownloadImage(
      `/api/quotes/${quote.id}/image`,
      "citation.png",
      `Citation de ${bookTitle}`,
    );
    setIsBusy(false);
    if (!ok) toast("Impossible de générer l'image. Réessayez.", "error");
  }

  async function handleDelete() {
    setIsBusy(true);
    const result = await apiFetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
    setIsBusy(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    router.refresh();
  }

  const iconButton =
    "flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-stone-400 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50";

  return (
    <div className="-mr-2 flex shrink-0">
      {isPremium && (
        <button
          type="button"
          onClick={handleShare}
          disabled={isBusy}
          className={iconButton}
          aria-label="Partager la citation en image"
        >
          <ShareNetwork size={16} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isBusy}
        className={iconButton}
        aria-label="Supprimer la citation"
      >
        <Trash size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Section « Citations » de la fiche d'un livre. */
export function BookQuotes({ bookId, bookTitle, quotes, isPremium }: BookQuotesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [page, setPage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await apiFetch(`/api/books/${bookId}/quotes`, {
      method: "POST",
      json: { content, page },
    });
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    setContent("");
    setPage("");
    router.refresh();
  }

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-lg text-stone-900">Citations</h2>
        <Link
          href="/books/citations"
          className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
        >
          Toutes mes citations
        </Link>
      </div>

      {quotes.length > 0 && (
        <ul className="mt-4 space-y-4">
          {quotes.map((entry) => (
            <li key={entry.id} className="border-accent-300 flex gap-3 border-l-2 pl-4">
              <div className="min-w-0 flex-1">
                <p className="font-serif whitespace-pre-line text-stone-800">{entry.content}</p>
                {entry.page !== null && (
                  <p className="mt-1 text-xs text-stone-500">Page {entry.page}</p>
                )}
              </div>
              <QuoteActions quote={entry} bookTitle={bookTitle} isPremium={isPremium} />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <Textarea
          label="Nouvelle citation"
          required
          maxLength={2000}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Le passage qui vous a marqué"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-32">
            <Field
              label="Page"
              type="number"
              inputMode="numeric"
              min={0}
              value={page}
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
          <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
            Enregistrer la citation
          </Button>
        </div>
      </form>
    </section>
  );
}
