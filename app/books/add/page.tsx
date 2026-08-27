"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

type BookStatus = "TO_READ" | "READING" | "FINISHED";

const STATUS_OPTIONS: { value: BookStatus; label: string; activeClass: string }[] = [
  { value: "TO_READ", label: "À lire", activeClass: "bg-stone-800 text-stone-50 shadow-md" },
  { value: "READING", label: "En cours", activeClass: "bg-accent-600 text-stone-50 shadow-md" },
  { value: "FINISHED", label: "Terminé", activeClass: "bg-moss-600 text-stone-50 shadow-md" },
];

interface BookSearchResult {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedDate: string | null;
  isbn: string | null;
  genres: string[] | null;
}

export default function AddBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isbnQuery, setIsbnQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHint, setSearchHint] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [existingByIsbn, setExistingByIsbn] = useState(new Map<string, string>());

  const [manualBook, setManualBook] = useState({
    title: "",
    author: "",
    isbn: "",
    description: "",
    coverUrl: "",
    pageCount: "",
    genre: "",
    publishedDate: "",
    userStartDate: "",
    userEndDate: "",
    status: "FINISHED" as BookStatus,
  });

  const runSearch = useCallback(
    async (overrideIsbn?: string) => {
      const isbn = overrideIsbn ?? isbnQuery;
      if (!searchQuery && !isbn) return;

      setIsLoading(true);
      setSearchHint("");
      setSearchResults([]);

      const params = new URLSearchParams(isbn ? { isbn } : { q: searchQuery });
      const result = await apiFetch<{ books: BookSearchResult[]; unavailable: string | null }>(
        `/api/books/search?${params}`,
      );
      setIsLoading(false);

      if (!result.ok) {
        toast(result.message, "error");
        return;
      }

      setSearchResults(result.data.books);

      // Google Books injoignable : on bascule directement en saisie manuelle plutôt que
      // de laisser l'utilisateur devant un écran vide sans issue.
      if (result.data.unavailable) {
        setSearchHint(result.message ?? "Recherche indisponible.");
        setManualMode(true);
      } else if (result.data.books.length === 0) {
        setSearchHint(
          "Aucun résultat. Essayez une autre recherche ou saisissez le livre à la main.",
        );
      }
    },
    [isbnQuery, searchQuery, toast],
  );

  // La fonction de recherche change à chaque frappe, mais le scanner relance sa caméra dès
  // que sa prop onDetected change : on la garde stable en passant par une ref.
  const runSearchRef = useRef(runSearch);
  useEffect(() => {
    runSearchRef.current = runSearch;
  }, [runSearch]);

  const handleBarcodeDetected = useCallback((code: string) => {
    setIsScannerOpen(false);
    setIsbnQuery(code);
    setSearchQuery("");
    void runSearchRef.current(code);
  }, []);

  // Table ISBN → id des livres déjà possédés, pour rediriger vers la fiche existante au
  // lieu de proposer un ajout en double.
  useEffect(() => {
    void apiFetch<{ id: string; isbn: string | null }[]>("/api/books").then((result) => {
      if (!result.ok) return;
      setExistingByIsbn(
        new Map(
          result.data
            .filter((entry): entry is { id: string; isbn: string } => Boolean(entry.isbn))
            .map((entry) => [entry.isbn, entry.id]),
        ),
      );
    });
  }, []);

  function selectBook(entry: BookSearchResult) {
    const existingId = entry.isbn ? existingByIsbn.get(entry.isbn) : undefined;
    if (existingId) {
      router.push(`/books/${existingId}`);
      return;
    }
    setSelectedBook(entry);
  }

  async function handleAddBook() {
    const payload = selectedBook
      ? {
          title: selectedBook.title,
          author: selectedBook.authors.join(", "),
          isbn: selectedBook.isbn,
          description: selectedBook.description,
          coverUrl: selectedBook.coverUrl,
          pageCount: selectedBook.pageCount,
          genre: selectedBook.genres?.join(", "),
          publishedDate: selectedBook.publishedDate,
          userStartDate: manualBook.userStartDate,
          userEndDate: manualBook.userEndDate,
          status: manualBook.status,
        }
      : manualBook;

    setIsLoading(true);
    const result = await apiFetch<{ id: string }>("/api/books", { method: "POST", json: payload });
    setIsLoading(false);

    if (!result.ok) {
      toast(result.message, "error");
      return;
    }

    // Droit sur la fiche : c'est là qu'on note le livre et qu'on lit sa description.
    router.push(`/books/${result.data.id}`);
  }

  function reset() {
    setSelectedBook(null);
    setManualMode(false);
    setSearchResults([]);
    setSearchHint("");
  }

  return (
    <>
      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8"
      >
        <header className="mb-6">
          <h1 className="font-serif text-2xl text-stone-900">Ajouter un livre</h1>
          <p className="mt-1 text-sm text-stone-500">Recherche, scan ou saisie manuelle</p>
        </header>

        {!manualMode && !selectedBook && (
          <div className="card p-5 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch();
              }}
              className="space-y-4"
            >
              <Field
                label="Titre ou auteur"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex : Le Petit Prince"
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-stone-400">ou</span>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Field
                  label="ISBN"
                  className="flex-1"
                  value={isbnQuery}
                  onChange={(e) => setIsbnQuery(e.target.value)}
                  placeholder="978-2070612758"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsScannerOpen(true)}
                  className="shrink-0 px-3"
                >
                  <BarcodeIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Scanner</span>
                </Button>
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full">
                {isLoading ? "Recherche…" : "Rechercher"}
              </Button>
            </form>

            {searchHint && !searchResults.length && (
              <p className="mt-4 text-center text-sm text-stone-500">{searchHint}</p>
            )}

            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="mt-4 w-full text-center text-sm font-medium text-stone-600 transition hover:text-stone-900"
            >
              Saisir manuellement
            </button>

            <Link
              href="/books/import"
              className="mt-2 block w-full text-center text-sm font-medium text-stone-600 transition hover:text-stone-900"
            >
              Importer plusieurs livres (CSV)
            </Link>
          </div>
        )}

        {searchResults.length > 0 && !selectedBook && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-stone-500">{searchResults.length} résultat(s)</p>
            {searchResults.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => selectBook(entry)}
                className="card card-interactive flex w-full gap-3 p-3 text-left"
              >
                <BookCover
                  coverUrl={entry.coverUrl}
                  alt={entry.title}
                  className="h-20 w-14 shrink-0 rounded-lg"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 font-medium text-stone-900">{entry.title}</p>
                  <p className="text-sm text-stone-500">{entry.authors.join(", ")}</p>
                  {entry.pageCount && (
                    <p className="mt-1 text-xs text-stone-400">{entry.pageCount} pages</p>
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
              <div className="mt-4 flex gap-3 rounded-[var(--radius-sm)] bg-stone-50/70 p-3 ring-1 ring-stone-100">
                <BookCover
                  coverUrl={selectedBook.coverUrl}
                  alt={selectedBook.title}
                  className="h-24 w-16 rounded-lg shadow-sm"
                />
                <div>
                  <p className="font-medium text-stone-900">{selectedBook.title}</p>
                  <p className="text-sm text-stone-500">{selectedBook.authors.join(", ")}</p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-4">
              {manualMode && (
                <>
                  <Field
                    label="Titre"
                    required
                    value={manualBook.title}
                    onChange={(e) => setManualBook({ ...manualBook, title: e.target.value })}
                  />
                  <Field
                    label="Auteur"
                    required
                    value={manualBook.author}
                    onChange={(e) => setManualBook({ ...manualBook, author: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Pages"
                      type="number"
                      inputMode="numeric"
                      value={manualBook.pageCount}
                      onChange={(e) => setManualBook({ ...manualBook, pageCount: e.target.value })}
                    />
                    <Field
                      label="Genre"
                      placeholder="Roman, SF…"
                      value={manualBook.genre}
                      onChange={(e) => setManualBook({ ...manualBook, genre: e.target.value })}
                    />
                  </div>
                </>
              )}

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium tracking-tight text-stone-700">
                  Statut
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={manualBook.status === option.value}
                      onClick={() => setManualBook({ ...manualBook, status: option.value })}
                      className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition ${
                        manualBook.status === option.value
                          ? option.activeClass
                          : "bg-card text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {manualBook.status !== "TO_READ" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Début"
                    type="date"
                    value={manualBook.userStartDate}
                    onChange={(e) =>
                      setManualBook({ ...manualBook, userStartDate: e.target.value })
                    }
                  />
                  {manualBook.status === "FINISHED" && (
                    <Field
                      label="Fin"
                      type="date"
                      value={manualBook.userEndDate}
                      onChange={(e) =>
                        setManualBook({ ...manualBook, userEndDate: e.target.value })
                      }
                    />
                  )}
                </div>
              )}

              <p className="text-xs text-stone-400">
                Vous pourrez noter le livre et lire sa description juste après l&apos;ajout.
              </p>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleAddBook} isLoading={isLoading} className="flex-1">
                  {isLoading ? "Ajout…" : "Ajouter"}
                </Button>
                <Button variant="secondary" onClick={reset}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isScannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </>
  );
}

function BarcodeIcon({ className }: { className?: string }) {
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
        d="M4 5.25v13.5m3-13.5v13.5m4.5-13.5v13.5M15 5.25v13.5m1.5-13.5v13.5m3-13.5v13.5M4 5.25h16.5M4 18.75h16.5"
      />
    </svg>
  );
}
