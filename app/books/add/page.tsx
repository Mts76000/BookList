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
import { BOOK_STATUSES, STATUS_ACTIVE, STATUS_LABELS, type BookStatus } from "@/lib/book-status";
import { BookLimitNotice, usePlan } from "@/components/book-limit-notice";
import {
  EMPTY_SERIES_CHOICE,
  SeriesChoice,
  type SeriesChoiceValue,
} from "@/components/series-choice";
import {
  matchKnownSeries,
  seriesForNewBook,
  seriesFromTitle,
  type KnownSeriesSummary,
} from "@/lib/series-detection";
import { findOwnedBook, type OwnedBook, type OwnedMatch } from "@/lib/book-match";

const STATUS_OPTIONS = BOOK_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
  activeClass: STATUS_ACTIVE[value],
}));

interface BookSearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedDate: string | null;
  isbn: string | null;
  genres: string[] | null;
}

type SearchResponse = { books: BookSearchResult[]; unavailable: string | null };

const EMPTY_MANUAL_BOOK = {
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
  // « À lire » par défaut : on ajoute le plus souvent un livre qu'on vient d'acheter ou
  // qu'on veut lire, plus rarement un livre déjà terminé.
  status: "TO_READ" as BookStatus,
};

export default function AddBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isbnQuery, setIsbnQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  // Résultat choisi alors qu'un livre correspondant est déjà dans la bibliothèque.
  const [duplicate, setDuplicate] = useState<{
    entry: BookSearchResult;
    match: OwnedMatch;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [searchHint, setSearchHint] = useState("");
  const [notFoundIsbn, setNotFoundIsbn] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [library, setLibrary] = useState<OwnedBook[]>([]);
  const [knownSeries, setKnownSeries] = useState<KnownSeriesSummary[]>([]);
  const [seriesChoice, setSeriesChoice] = useState<SeriesChoiceValue>(EMPTY_SERIES_CHOICE);
  const [titleHint, setTitleHint] = useState<{ name: string; index: number | null } | null>(null);
  // Nombre de pages du livre choisi, modifiable : aucune source n'est infaillible.
  const [pageCount, setPageCount] = useState("");
  const [plan, refreshPlan] = usePlan();
  const isLibraryFull = plan?.remaining === 0;
  // Incrémenté à chaque choix : une vérification d'édition arrivée après un autre choix
  // (ou une annulation) est ignorée.
  const selectionRef = useRef(0);
  // La saga a été modifiée à la main : la recherche Wikidata, arrivée après, n'y touche pas.
  const seriesTouchedRef = useRef(false);

  const [manualBook, setManualBook] = useState(EMPTY_MANUAL_BOOK);

  /**
   * Complète un résultat de recherche texte par la fiche de son ISBN, qui croise Google,
   * Open Library et la BnF : couverture manquante, et surtout nombre de pages de cette
   * édition-là. Faite après coup pour ne pas retarder l'affichage de la confirmation.
   */
  async function enrich(entry: BookSearchResult, selection: number) {
    if (!entry.isbn) return;
    setIsEnriching(true);
    const result = await apiFetch<SearchResponse>(
      `/api/books/search?${new URLSearchParams({ isbn: entry.isbn })}`,
    );
    if (selection !== selectionRef.current) return;
    setIsEnriching(false);
    const edition = result.ok ? result.data.books[0] : undefined;
    if (!edition) return;
    setSelectedBook((current) =>
      current && current.id === entry.id
        ? {
            ...current,
            coverUrl: current.coverUrl ?? edition.coverUrl,
            pageCount: edition.pageCount ?? current.pageCount,
            description: current.description ?? edition.description,
            publishedDate: current.publishedDate ?? edition.publishedDate,
          }
        : current,
    );
    // Le nombre de pages saisi à la main n'est pas écrasé.
    if (edition.pageCount) {
      setPageCount((current) =>
        current === "" || current === entry.pageCount?.toString()
          ? String(edition.pageCount)
          : current,
      );
    }
  }

  /**
   * Saga du livre d'après Wikidata, cherchée en arrière-plan : elle trouve ce que le titre
   * ne dit pas (« Harry Potter et la Chambre des secrets » → Harry Potter, tome 2).
   *
   * Une saga déjà dans la bibliothèque est cochée d'office, même écrite autrement ou venue
   * d'une autre édition (« Le cycle de Dune » pour « Dune ») : on range de préférence dans
   * l'existant. Une saga nouvelle n'est que proposée, case décochée : Wikidata classe parfois
   * en « série » des livres qui n'en sont pas pour un lecteur.
   */
  async function lookupSeries(entry: BookSearchResult, selection: number) {
    const params = new URLSearchParams({ title: entry.title });
    if (entry.subtitle) params.set("subtitle", entry.subtitle);
    const result = await apiFetch<
      { found: false } | { found: true; name: string; index: number | null; total: number | null }
    >(`/api/series/lookup?${params}`);
    if (selection !== selectionRef.current || seriesTouchedRef.current) return;
    if (!result.ok || !result.data.found) return;
    const found = result.data;
    const existing = matchKnownSeries(found.name, entry.authors.join(", "), knownSeries);

    setSeriesChoice((current) => {
      const sameSaga =
        current.name.trim().toLowerCase() === (existing?.name ?? found.name).toLowerCase();
      if (existing) {
        return {
          enabled: true,
          name: existing.name,
          index:
            found.index?.toString() ??
            (sameSaga && current.index ? current.index : String(existing.nextIndex)),
          total: (existing.total ?? found.total)?.toString() ?? "",
          detected: true,
        };
      }
      // Le titre annonçait déjà une saga : on la garde, complétée du tome et du total.
      if (current.enabled) {
        return sameSaga
          ? {
              ...current,
              index: current.index || (found.index?.toString() ?? ""),
              total: current.total || (found.total?.toString() ?? ""),
            }
          : current;
      }
      return {
        enabled: false,
        name: found.name,
        index: found.index?.toString() ?? "",
        total: found.total?.toString() ?? "",
        detected: true,
      };
    });
  }

  function confirmBook(entry: BookSearchResult, { fromIsbn }: { fromIsbn: boolean }) {
    const selection = ++selectionRef.current;
    setDuplicate(null);
    setSelectedBook(entry);
    setPageCount(entry.pageCount?.toString() ?? "");
    setIsEnriching(false);
    const author = entry.authors.join(", ");
    const hint = seriesFromTitle(entry.title, entry.subtitle);
    setTitleHint(hint ? { name: hint.seriesName, index: hint.seriesIndex } : null);
    const detected = seriesForNewBook(entry.title, entry.subtitle, author, knownSeries);
    setSeriesChoice(
      detected
        ? {
            enabled: true,
            name: detected.seriesName,
            index: detected.seriesIndex?.toString() ?? "",
            total: detected.seriesTotal?.toString() ?? "",
            detected: true,
          }
        : EMPTY_SERIES_CHOICE,
    );
    // Un résultat d'ISBN est déjà la fiche croisée des trois sources.
    seriesTouchedRef.current = false;
    void lookupSeries(entry, selection);
    if (!fromIsbn) void enrich(entry, selection);
  }

  function selectBook(entry: BookSearchResult, options = { fromIsbn: false }) {
    const match = findOwnedBook(entry, library);
    if (match) {
      selectionRef.current++;
      setSelectedBook(null);
      setDuplicate({ entry, match });
      return;
    }
    confirmBook(entry, options);
  }

  async function runSearch(overrideIsbn?: string) {
    const isbn = (overrideIsbn ?? isbnQuery).trim();
    if (!searchQuery.trim() && !isbn) return;

    setIsLoading(true);
    setSearchHint("");
    setNotFoundIsbn(null);
    setSearchResults([]);

    const params = new URLSearchParams(isbn ? { isbn } : { q: searchQuery });
    const result = await apiFetch<SearchResponse>(`/api/books/search?${params}`);
    setIsLoading(false);

    if (!result.ok) {
      toast(result.message, "error");
      return;
    }

    const { books, unavailable } = result.data;
    setSearchResults(books);

    // Recherche indisponible : on bascule directement en saisie manuelle plutôt que de
    // laisser l'utilisateur devant un écran vide sans issue.
    if (unavailable) {
      setSearchHint(result.message ?? "Recherche indisponible.");
      setManualBook({ ...EMPTY_MANUAL_BOOK, isbn });
      setManualMode(true);
    } else if (books.length === 0) {
      setSearchHint(
        isbn
          ? "Cet ISBN est introuvable dans nos sources (Google Books, Open Library, BnF)."
          : "Aucun résultat. Essayez avec l'auteur, un autre titre, ou saisissez le livre à la main.",
      );
      if (isbn) setNotFoundIsbn(isbn);
    } else if (isbn && books.length === 1) {
      // Un code-barres désigne une seule édition : on passe directement à la confirmation.
      selectBook(books[0], { fromIsbn: true });
    }
  }

  // Le scanner relance sa caméra dès que sa prop onDetected change : on la garde stable en
  // passant par une ref vers la dernière version de la recherche.
  const runSearchRef = useRef(runSearch);
  useEffect(() => {
    runSearchRef.current = runSearch;
  });

  const handleBarcodeDetected = useCallback((code: string) => {
    setIsScannerOpen(false);
    setIsbnQuery(code);
    setSearchQuery("");
    void runSearchRef.current(code);
  }, []);

  useEffect(() => {
    // Livres déjà possédés, pour signaler un doublon (même ISBN, ou même titre et auteur)
    // au lieu de proposer un second exemplaire.
    void apiFetch<OwnedBook[]>("/api/books").then((result) => {
      if (result.ok) setLibrary(result.data);
    });
    // Sagas de la bibliothèque, pour proposer d'y ranger le livre ajouté.
    void apiFetch<KnownSeriesSummary[]>("/api/series").then((result) => {
      if (result.ok) setKnownSeries(result.data);
    });
  }, []);

  /** Ce qu'une édition trouvée apporterait à la fiche existante (champs vides seulement). */
  function missingFields(entry: BookSearchResult, owned: OwnedBook) {
    return {
      ...(!owned.isbn && entry.isbn && { isbn: entry.isbn }),
      ...(!owned.coverUrl && entry.coverUrl && { coverUrl: entry.coverUrl }),
      ...(!owned.pageCount && entry.pageCount && { pageCount: entry.pageCount }),
    };
  }

  async function completeOwned(entry: BookSearchResult, owned: OwnedBook) {
    setIsLoading(true);
    const result = await apiFetch(`/api/books/${owned.id}`, {
      method: "PATCH",
      json: missingFields(entry, owned),
    });
    setIsLoading(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast("Fiche complétée.", "success");
    router.push(`/books/${owned.id}`);
  }

  async function handleAddBook() {
    const series =
      seriesChoice.enabled && seriesChoice.name.trim()
        ? {
            seriesName: seriesChoice.name,
            seriesIndex: seriesChoice.index,
            seriesTotal: seriesChoice.total,
          }
        : {};
    const bookFields = selectedBook
      ? {
          title: selectedBook.title,
          author: selectedBook.authors.join(", "),
          isbn: selectedBook.isbn,
          description: selectedBook.description,
          coverUrl: selectedBook.coverUrl,
          pageCount,
          genre: selectedBook.genres?.join(", "),
          publishedDate: selectedBook.publishedDate,
          userStartDate: manualBook.userStartDate,
          userEndDate: manualBook.userEndDate,
          status: manualBook.status,
        }
      : manualBook;
    const payload = { ...bookFields, ...series };

    setIsLoading(true);
    const result = await apiFetch<{ id: string }>("/api/books", { method: "POST", json: payload });
    setIsLoading(false);

    if (!result.ok) {
      toast(result.message, "error");
      // Limite atteinte entre-temps (ajout depuis un autre onglet) : on affiche l'offre.
      if (result.code === "FORBIDDEN") refreshPlan();
      return;
    }

    // Droit sur la fiche : c'est là qu'on note le livre et qu'on lit sa description.
    router.push(`/books/${result.data.id}`);
  }

  function openManual(isbn = "") {
    selectionRef.current++;
    setSelectedBook(null);
    setDuplicate(null);
    setManualBook({ ...EMPTY_MANUAL_BOOK, isbn, status: manualBook.status });
    setSeriesChoice(EMPTY_SERIES_CHOICE);
    setTitleHint(null);
    setManualMode(true);
  }

  function reset() {
    selectionRef.current++;
    setSelectedBook(null);
    setDuplicate(null);
    setIsEnriching(false);
    setSeriesChoice(EMPTY_SERIES_CHOICE);
    setTitleHint(null);
    setManualMode(false);
  }

  /** Retour à la liste des résultats, conservée, depuis la confirmation ou un doublon. */
  const hasResults = searchResults.length > 0;
  const confirmAuthor = selectedBook ? selectedBook.authors.join(", ") : manualBook.author;

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

        <BookLimitNotice plan={plan} />

        {!isLibraryFull && !manualMode && !selectedBook && !duplicate && (
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Le titre prime : un ISBN resté dans l'autre champ ne doit pas gagner.
                  if (e.target.value) setIsbnQuery("");
                }}
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
                <div className="flex-1">
                  <Field
                    label="ISBN"
                    inputMode="numeric"
                    value={isbnQuery}
                    onChange={(e) => {
                      setIsbnQuery(e.target.value);
                      if (e.target.value) setSearchQuery("");
                    }}
                    placeholder="978-2070612758"
                  />
                </div>
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

            {searchHint && !hasResults && (
              <div className="mt-4 text-center text-sm text-stone-500">
                <p>{searchHint}</p>
                {notFoundIsbn && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openManual(notFoundIsbn)}
                    className="mt-3"
                  >
                    Saisir ce livre à la main
                  </Button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => openManual(isbnQuery.trim())}
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

        {hasResults && !selectedBook && !duplicate && !manualMode && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-stone-500">
              {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
            </p>
            {searchResults.map((entry) => {
              const owned = findOwnedBook(entry, library);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectBook(entry)}
                  className="card card-interactive flex w-full gap-3 p-3 text-left"
                >
                  <BookCover
                    coverUrl={entry.coverUrl}
                    alt={entry.title}
                    author={entry.authors.join(", ")}
                    className="h-20 w-14 shrink-0 rounded-[3px]"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium text-stone-900">{entry.title}</p>
                    <p className="truncate text-sm text-stone-500">{entry.authors.join(", ")}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {[
                        entry.publishedDate?.slice(0, 4),
                        entry.pageCount && `${entry.pageCount} pages`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {owned && (
                      <p className="bg-moss-500/10 text-moss-700 mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium">
                        Déjà dans votre bibliothèque
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {duplicate && (
          <DuplicatePanel
            entry={duplicate.entry}
            match={duplicate.match}
            canComplete={
              Object.keys(missingFields(duplicate.entry, duplicate.match.book)).length > 0
            }
            isLoading={isLoading}
            onOpen={() => router.push(`/books/${duplicate.match.book.id}`)}
            onComplete={() => void completeOwned(duplicate.entry, duplicate.match.book)}
            onAddAnyway={() => confirmBook(duplicate.entry, { fromIsbn: false })}
            onBack={reset}
          />
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
                  author={confirmAuthor}
                  className="h-24 w-16 shrink-0 rounded-[3px] shadow-sm"
                />
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{selectedBook.title}</p>
                  <p className="text-sm text-stone-500">{confirmAuthor}</p>
                  {selectedBook.isbn && (
                    <p className="mt-1 text-xs text-stone-400">ISBN {selectedBook.isbn}</p>
                  )}
                  {isEnriching && (
                    <p className="mt-1 text-xs text-stone-400" role="status">
                      Vérification de l&apos;édition…
                    </p>
                  )}
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
                  <Field
                    label="ISBN"
                    inputMode="numeric"
                    value={manualBook.isbn}
                    onChange={(e) => setManualBook({ ...manualBook, isbn: e.target.value })}
                  />
                </>
              )}

              {selectedBook && (
                <Field
                  label="Nombre de pages"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  helperText="Vérifiez-le sur votre exemplaire : il varie d'une édition à l'autre."
                />
              )}

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium tracking-tight text-stone-700">
                  Statut
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                <div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="Début"
                      type="date"
                      value={manualBook.userStartDate}
                      onChange={(e) =>
                        setManualBook({ ...manualBook, userStartDate: e.target.value })
                      }
                    />
                    {(manualBook.status === "FINISHED" || manualBook.status === "ABANDONED") && (
                      <Field
                        label={manualBook.status === "ABANDONED" ? "Arrêt" : "Fin"}
                        type="date"
                        value={manualBook.userEndDate}
                        onChange={(e) =>
                          setManualBook({ ...manualBook, userEndDate: e.target.value })
                        }
                      />
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-stone-400">
                    Facultatif : sans date, le livre est daté du jour où vous changez son statut.
                  </p>
                </div>
              )}

              <SeriesChoice
                value={seriesChoice}
                onChange={(value) => {
                  seriesTouchedRef.current = true;
                  setSeriesChoice(value);
                }}
                known={knownSeries}
                author={confirmAuthor}
                titleHint={titleHint}
              />

              <p className="text-xs text-stone-400">
                Vous pourrez noter le livre et lire sa description juste après l&apos;ajout.
              </p>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleAddBook} isLoading={isLoading} className="flex-1">
                  {isLoading ? "Ajout…" : "Ajouter"}
                </Button>
                <Button variant="secondary" onClick={reset}>
                  {hasResults ? "Retour" : "Annuler"}
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

/**
 * Le livre choisi est déjà dans la bibliothèque : même ISBN, ou même titre et même auteur
 * (ajouté par son nom, ou sous une autre édition). On mène vers la fiche existante plutôt
 * que vers un doublon, en laissant la possibilité d'ajouter une seconde édition.
 */
function DuplicatePanel({
  entry,
  match,
  canComplete,
  isLoading,
  onOpen,
  onComplete,
  onAddAnyway,
  onBack,
}: {
  entry: BookSearchResult;
  match: OwnedMatch;
  canComplete: boolean;
  isLoading: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onAddAnyway: () => void;
  onBack: () => void;
}) {
  return (
    <div className="card p-5 sm:p-6" role="status">
      <h2 className="font-medium text-stone-900">Déjà dans votre bibliothèque</h2>
      <div className="mt-4 flex gap-3 rounded-[var(--radius-sm)] bg-stone-50/70 p-3 ring-1 ring-stone-100">
        <BookCover
          coverUrl={match.book.coverUrl ?? entry.coverUrl}
          alt={match.book.title}
          author={match.book.author}
          className="h-24 w-16 shrink-0 rounded-[3px] shadow-sm"
        />
        <div className="min-w-0">
          <p className="font-medium text-stone-900">{match.book.title}</p>
          <p className="text-sm text-stone-500">{match.book.author}</p>
          <p className="mt-2 text-xs text-stone-500">
            {match.by === "isbn"
              ? "Même ISBN que ce livre."
              : "Même titre et même auteur : sans doute ajouté par son nom ou sous une autre édition."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button onClick={onOpen}>Ouvrir la fiche</Button>
        {canComplete && (
          <Button variant="secondary" onClick={onComplete} isLoading={isLoading}>
            Compléter la fiche avec cette édition
          </Button>
        )}
        {match.by === "title" && (
          <Button variant="secondary" onClick={onAddAnyway}>
            Ajouter quand même (autre exemplaire)
          </Button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="mt-1 text-sm font-medium text-stone-600 transition hover:text-stone-900"
        >
          Retour
        </button>
      </div>
    </div>
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
