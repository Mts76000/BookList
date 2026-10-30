"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { BookCover } from "@/components/book-cover";
import { apiFetch } from "@/lib/api-client";
import { normalizeText } from "@/lib/series-detection";

export interface EditorBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  seriesName: string | null;
  seriesIndex: number | null;
}

export interface SeriesDraft {
  name: string;
  total: number | null;
  volumes: { bookId: string; seriesIndex: number | null }[];
}

interface SeriesEditorProps {
  /** Toute la bibliothèque, pour chercher les livres à ajouter. */
  library: EditorBook[];
  /** Noms des sagas existantes, proposés à la saisie du nom. */
  existingNames: string[];
  /** Saga à modifier, ou proposition à vérifier ; vide pour une nouvelle saga. */
  initial?: SeriesDraft;
  /** Nom actuel d'une saga existante : active le renommage, le retrait et « Défaire ». */
  previousName?: string;
  triggerLabel: string;
  triggerVariant?: "primary" | "secondary" | "ghost";
  triggerClassName?: string;
}

type Volume = { bookId: string; seriesIndex: string };

const toVolumes = (draft?: SeriesDraft): Volume[] =>
  (draft?.volumes ?? []).map((volume) => ({
    bookId: volume.bookId,
    seriesIndex: volume.seriesIndex?.toString() ?? "",
  }));

/**
 * Création et modification d'une saga en un seul écran : son nom, ses livres pris dans la
 * bibliothèque, leur ordre et leur numéro de tome. Plus besoin d'ouvrir chaque livre pour
 * y recopier le nom de la série.
 */
export function SeriesEditor({
  library,
  existingNames,
  initial,
  previousName,
  triggerLabel,
  triggerVariant = "secondary",
  triggerClassName = "",
}: SeriesEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const listId = useId();

  const [name, setName] = useState(initial?.name ?? "");
  const [total, setTotal] = useState(initial?.total?.toString() ?? "");
  const [volumes, setVolumes] = useState<Volume[]>(() => toVolumes(initial));
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const byId = new Map(library.map((entry) => [entry.id, entry]));
  const selected = new Set(volumes.map((volume) => volume.bookId));

  function open() {
    // Repart de la saga telle qu'elle est enregistrée à chaque ouverture.
    setName(initial?.name ?? "");
    setTotal(initial?.total?.toString() ?? "");
    setVolumes(toVolumes(initial));
    setQuery("");
    setIsConfirmingDelete(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  const nextIndex = () =>
    Math.max(0, ...volumes.map((volume) => Number.parseInt(volume.seriesIndex, 10) || 0)) + 1;

  function addBook(bookId: string) {
    setVolumes((current) => [...current, { bookId, seriesIndex: String(nextIndex()) }]);
    setQuery("");
  }

  function move(index: number, offset: -1 | 1) {
    setVolumes((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function numberInOrder() {
    setVolumes((current) =>
      current.map((volume, index) => ({ ...volume, seriesIndex: String(index + 1) })),
    );
  }

  // Résultats de recherche : livres absents de la saga, ceux sans saga d'abord.
  const normalizedQuery = normalizeText(query);
  const results = normalizedQuery
    ? library
        .filter(
          (entry) =>
            !selected.has(entry.id) &&
            normalizeText(`${entry.title} ${entry.author}`).includes(normalizedQuery),
        )
        .sort((a, b) => Number(!!a.seriesName) - Number(!!b.seriesName))
        .slice(0, 8)
    : [];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await apiFetch<{ name: string }>("/api/series", {
      method: "PUT",
      json: { name, previousName: previousName ?? null, total, volumes },
    });
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast(result.message ?? "Saga enregistrée.", "success");
    close();
    router.refresh();
  }

  async function handleDelete() {
    if (!previousName) return;
    setIsSaving(true);
    const result = await apiFetch("/api/series", {
      method: "DELETE",
      json: { name: previousName },
    });
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast(result.message ?? "Saga défaite.", "success");
    close();
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant={triggerVariant} onClick={open} className={triggerClassName}>
        {triggerLabel}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="bg-card m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-xl rounded-[var(--radius-lg)] p-0 text-stone-900 shadow-[0_30px_60px_-20px_rgba(36,29,21,0.5)] backdrop:bg-stone-900/40 backdrop:backdrop-blur-[2px]"
      >
        <form onSubmit={handleSave} className="flex max-h-[92dvh] flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-stone-100 px-5 py-4">
            <h2 id={titleId} className="font-serif text-xl">
              {previousName ? "Modifier la saga" : "Nouvelle saga"}
            </h2>
            <button
              type="button"
              onClick={close}
              className="-m-2 flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              aria-label="Fermer"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <Field
                label="Nom de la saga"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Dune"
                list={listId}
                autoComplete="off"
              />
              <Field
                label="Nb de tomes"
                type="number"
                inputMode="numeric"
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="?"
              />
              <datalist id={listId}>
                {existingNames.map((existing) => (
                  <option key={existing} value={existing} />
                ))}
              </datalist>
            </div>

            <section aria-label="Tomes de la saga">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-stone-700">Tomes ({volumes.length})</h3>
                {volumes.length > 1 && (
                  <button
                    type="button"
                    onClick={numberInOrder}
                    className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
                  >
                    Numéroter dans cet ordre
                  </button>
                )}
              </div>
              {volumes.length === 0 ? (
                <p className="rounded-[var(--radius-sm)] border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
                  Cherchez ci-dessous les livres de la saga dans votre bibliothèque.
                </p>
              ) : (
                <ol className="divide-y divide-stone-100 rounded-[var(--radius-sm)] border border-stone-200">
                  {volumes.map((volume, index) => {
                    const entry = byId.get(volume.bookId);
                    if (!entry) return null;
                    return (
                      <li
                        key={volume.bookId}
                        className="flex items-center gap-2 px-3 py-2 sm:gap-3"
                      >
                        <BookCover
                          coverUrl={entry.coverUrl}
                          alt={entry.title}
                          author={entry.author}
                          className="aspect-[2/3] w-9 shrink-0 rounded-[4px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm leading-snug font-medium">
                            {entry.title}
                          </p>
                          <p className="truncate text-xs text-stone-500">{entry.author}</p>
                        </div>
                        <label className="flex shrink-0 items-center gap-1 text-xs text-stone-500">
                          <span className="hidden sm:inline">Tome</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={volume.seriesIndex}
                            onChange={(e) =>
                              setVolumes((current) =>
                                current.map((item) =>
                                  item.bookId === volume.bookId
                                    ? { ...item, seriesIndex: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="focus:border-accent-400 w-11 rounded-[6px] border border-stone-200 bg-white px-1.5 py-1.5 text-center text-sm text-stone-900 tabular-nums focus:outline-none"
                            aria-label={`Numéro de tome de ${entry.title}`}
                          />
                        </label>
                        {/* Flèches empilées sur mobile, pour laisser la place au titre. */}
                        <div className="flex shrink-0 flex-col sm:flex-row">
                          <IconButton
                            label={`Monter ${entry.title}`}
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp size={14} aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label={`Descendre ${entry.title}`}
                            disabled={index === volumes.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown size={14} aria-hidden="true" />
                          </IconButton>
                        </div>
                        <IconButton
                          label={`Retirer ${entry.title} de la saga`}
                          onClick={() =>
                            setVolumes((current) =>
                              current.filter((item) => item.bookId !== volume.bookId),
                            )
                          }
                        >
                          <X size={14} aria-hidden="true" />
                        </IconButton>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section aria-label="Ajouter des livres">
              <div className="relative">
                <MagnifyingGlass
                  className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-stone-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ajouter un livre : titre ou auteur"
                  aria-label="Chercher un livre à ajouter"
                  className="border-border focus:border-accent-400 focus:ring-accent-400/15 w-full rounded-[var(--radius-sm)] border bg-white py-3 pr-4 pl-11 text-base placeholder:text-stone-400 focus:ring-4 focus:outline-none"
                />
              </div>
              {normalizedQuery && (
                <ul className="mt-2 divide-y divide-stone-100 rounded-[var(--radius-sm)] border border-stone-200">
                  {results.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-stone-500">
                      Aucun livre de votre bibliothèque ne correspond.
                    </li>
                  ) : (
                    results.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => addBook(entry.id)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-stone-50"
                        >
                          <BookCover
                            coverUrl={entry.coverUrl}
                            alt={entry.title}
                            author={entry.author}
                            className="aspect-[2/3] w-8 shrink-0 rounded-[4px]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {entry.title}
                            </span>
                            <span className="block truncate text-xs text-stone-500">
                              {entry.author}
                              {entry.seriesName && ` · déjà dans « ${entry.seriesName} »`}
                            </span>
                          </span>
                          <Plus size={16} className="shrink-0 text-stone-400" aria-hidden="true" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </section>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center">
            {previousName &&
              (isConfirmingDelete ? (
                <div className="flex items-center gap-2 sm:mr-auto">
                  <span className="text-sm text-stone-600">Les livres restent.</span>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isSaving}
                  >
                    Défaire
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-stone-500 sm:mr-auto"
                >
                  Défaire la saga
                </Button>
              ))}
            <Button type="button" variant="secondary" onClick={close} className="sm:ml-auto">
              Annuler
            </Button>
            <Button type="submit" isLoading={isSaving} disabled={volumes.length === 0}>
              Enregistrer
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-[6px] text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent sm:size-8"
    >
      {children}
    </button>
  );
}
