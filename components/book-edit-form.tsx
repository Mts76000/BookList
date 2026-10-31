"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import {
  BOOK_FORMATS,
  BOOK_STATUSES,
  FORMAT_LABELS,
  STATUS_ACTIVE,
  STATUS_LABELS,
  type BookStatus,
} from "@/lib/book-status";
import type { KnownSeries } from "@/lib/series-store";

export interface EditableBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  genre: string | null;
  publishedDate: string | null;
  userStartDate: string | Date | null;
  userEndDate: string | Date | null;
  status: BookStatus;
  format: string | null;
  seriesName: string | null;
  seriesIndex: number | null;
  seriesTotal: number | null;
}

/** Formate une date pour un champ `type="date"`, qui n'accepte que `YYYY-MM-DD`. */
function toDateInput(value: string | Date | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-serif text-lg text-stone-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Modification d'un livre, sur sa propre page : les informations du livre, la lecture, puis
 * la saga, chacune dans son bloc. Les citations et les notes restent sur la fiche.
 */
export function BookEditForm({
  book,
  knownSeries = [],
}: {
  book: EditableBook;
  /** Sagas de la bibliothèque, proposées à la saisie du nom de saga. */
  knownSeries?: KnownSeries[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
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
    format: book.format ?? "",
    seriesName: book.seriesName ?? "",
    seriesIndex: book.seriesIndex?.toString() ?? "",
    seriesTotal: book.seriesTotal?.toString() ?? "",
  });
  const set = (changes: Partial<typeof form>) => setForm((current) => ({ ...current, ...changes }));
  const bookUrl = `/books/${book.id}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    // Les chaînes vides sont converties en NULL par le schéma Zod. Sans nom de saga, le
    // numéro de tome n'a plus de sens : il est effacé avec.
    const json = form.seriesName.trim() ? form : { ...form, seriesIndex: "", seriesTotal: "" };
    const result = await apiFetch(`/api/books/${book.id}`, { method: "PATCH", json });
    if (!result.ok) {
      setIsSaving(false);
      toast(result.message, "error");
      return;
    }
    toast("Livre mis à jour.", "success");
    router.push(bookUrl);
    router.refresh();
  }

  function changeSeriesName(seriesName: string) {
    // Une saga existante choisie : on propose le tome suivant et son nombre de tomes, sans
    // écraser ce qui est déjà saisi.
    const known = knownSeries.find(
      (entry) => entry.name.toLowerCase() === seriesName.trim().toLowerCase(),
    );
    set({
      seriesName,
      seriesIndex: form.seriesIndex || !known ? form.seriesIndex : String(known.nextIndex),
      seriesTotal: form.seriesTotal || !known?.total ? form.seriesTotal : String(known.total),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Section title="Le livre">
        <Field
          label="Titre"
          required
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <Field
          label="Auteur"
          required
          value={form.author}
          onChange={(e) => set({ author: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Pages"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.pageCount}
            onChange={(e) => set({ pageCount: e.target.value })}
          />
          <Field
            label="Année de parution"
            placeholder="2019"
            value={form.publishedDate}
            onChange={(e) => set({ publishedDate: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Genres"
            placeholder="Roman, Science-fiction"
            helperText="Séparés par des virgules."
            value={form.genre}
            onChange={(e) => set({ genre: e.target.value })}
          />
          <Select
            label="Format"
            value={form.format}
            onChange={(e) => set({ format: e.target.value })}
          >
            <option value="">Non précisé</option>
            {BOOK_FORMATS.map((format) => (
              <option key={format} value={format}>
                {FORMAT_LABELS[format]}
              </option>
            ))}
          </Select>
        </div>
        <Textarea
          label="Résumé"
          rows={5}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <Field
          label="Adresse de la couverture"
          type="url"
          placeholder="https://…"
          helperText="Laissez vide pour une couverture générée."
          value={form.coverUrl}
          onChange={(e) => set({ coverUrl: e.target.value })}
        />
      </Section>

      <Section title="Votre lecture">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium tracking-tight text-stone-700">
            Statut
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BOOK_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={form.status === status}
                onClick={() => set({ status })}
                className={`min-h-11 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition ${
                  form.status === status
                    ? STATUS_ACTIVE[status]
                    : "bg-card text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Un livre à lire n'a pas encore de dates de lecture. */}
        {form.status !== "TO_READ" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Commencé le"
              type="date"
              value={form.userStartDate}
              onChange={(e) => set({ userStartDate: e.target.value })}
            />
            {(form.status === "FINISHED" || form.status === "ABANDONED") && (
              <Field
                label={form.status === "ABANDONED" ? "Arrêté le" : "Terminé le"}
                type="date"
                value={form.userEndDate}
                onChange={(e) => set({ userEndDate: e.target.value })}
              />
            )}
          </div>
        )}
      </Section>

      <Section
        title="Saga"
        description="Seulement si ce livre fait partie d'une série : il sera rangé avec les autres tomes dans Mes sagas."
      >
        <Field
          label="Nom de la saga"
          placeholder="Ex. : Fondation"
          list="known-series"
          autoComplete="off"
          value={form.seriesName}
          onChange={(e) => changeSeriesName(e.target.value)}
        />
        <datalist id="known-series">
          {knownSeries.map((entry) => (
            <option key={entry.name} value={entry.name} />
          ))}
        </datalist>
        {form.seriesName.trim() && (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Tome n°"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="1"
              value={form.seriesIndex}
              onChange={(e) => set({ seriesIndex: e.target.value })}
            />
            <Field
              label="Nombre de tomes"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Si connu"
              value={form.seriesTotal}
              onChange={(e) => set({ seriesTotal: e.target.value })}
            />
          </div>
        )}
      </Section>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link href={bookUrl} className={buttonClasses("secondary", "w-full sm:w-auto")}>
          Annuler
        </Link>
        <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
          Enregistrer les modifications
        </Button>
      </div>
    </form>
  );
}
