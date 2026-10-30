import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getUserPlan } from "@/lib/subscription";
import { groupSeries } from "@/lib/series";
import { BooksTabs } from "@/components/books-tabs";
import { BookCover } from "@/components/book-cover";
import { PremiumTeaser } from "@/components/premium-teaser";
import { SeriesEditor, type EditorBook } from "@/components/series-editor";
import { SeriesSuggestions, type SuggestionView } from "@/components/series-suggestions";
import { suggestSeries } from "@/lib/series-detection";
import { SeriesCompletion } from "@/components/series-completion";

/** Statut d'un tome, sous sa couverture : une pastille et un mot, lisibles sans légende. */
const STATUS = {
  FINISHED: { label: "Lu", dot: "bg-moss-500" },
  READING: { label: "En cours", dot: "bg-accent-500" },
  TO_READ: { label: "À lire", dot: "bg-stone-300" },
  ABANDONED: { label: "Abandonné", dot: "bg-stone-400" },
} as const;

export default async function SeriesPage() {
  const session = await requireAuthPage("/books/sagas");
  const plan = await getUserPlan(session.user.id);

  // Toute la bibliothèque : l'éditeur y cherche les livres à ajouter, et la détection y
  // repère les sagas qui ne sont pas encore renseignées.
  const library = await db
    .select({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      status: book.status,
      seriesName: book.seriesName,
      seriesIndex: book.seriesIndex,
      seriesTotal: book.seriesTotal,
      publishedDate: book.publishedDate,
    })
    .from(book)
    .where(eq(book.userId, session.user.id));
  const allSeries = groupSeries(library.filter((entry) => entry.seriesName));
  // Toutes les sagas sont visibles, compte gratuit compris : ce sont ses propres données.
  // Premium ajoute les sagas repérées automatiquement et les tomes manquants.
  const series = allSeries;

  const editorLibrary: EditorBook[] = library.map(
    ({ id, title, author, coverUrl, seriesName, seriesIndex }) => ({
      id,
      title,
      author,
      coverUrl,
      seriesName,
      seriesIndex,
    }),
  );
  const existingNames = allSeries.map((entry) => entry.name);
  const byId = new Map(library.map((entry) => [entry.id, entry]));

  // Une suggestion pour une saga existante reprend ses tomes actuels, suivis des nouveaux.
  const detected = suggestSeries(library);
  // Un compte gratuit n'apprend que le nombre de sagas repérées, pas leur contenu.
  const suggestions: SuggestionView[] = (plan.isPremium ? detected : []).map((suggestion) => {
    const current = suggestion.existing
      ? (allSeries.find((entry) => entry.name === suggestion.name)?.books ?? [])
      : [];
    return {
      key: suggestion.key,
      name: suggestion.name,
      existing: suggestion.existing,
      reason: suggestion.reason,
      books: suggestion.books.map(({ id }) => {
        const entry = byId.get(id)!;
        return { id, title: entry.title, author: entry.author, coverUrl: entry.coverUrl };
      }),
      draft: {
        name: suggestion.name,
        total: current[0]?.seriesTotal ?? null,
        volumes: [
          ...current.map((entry) => ({ bookId: entry.id, seriesIndex: entry.seriesIndex })),
          ...suggestion.books.map(({ id, seriesIndex }) => ({ bookId: id, seriesIndex })),
        ],
      },
    };
  });

  return (
    <main
      id="main-content"
      className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <BooksTabs active="/books/sagas" />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-stone-900 sm:text-3xl">Vos sagas</h1>
          <p className="mt-1 text-sm text-stone-500">
            Regroupez les tomes d&apos;une série pour savoir lequel lire ensuite.
          </p>
        </div>
        <SeriesEditor
          library={editorLibrary}
          existingNames={existingNames}
          triggerLabel="Nouvelle saga"
          triggerVariant="primary"
          triggerClassName="w-full sm:w-auto"
        />
      </header>

      <SeriesSuggestions
        suggestions={suggestions}
        library={editorLibrary}
        existingNames={existingNames}
      />

      {series.length === 0 ? (
        <p className="card p-6 text-center text-sm text-stone-500">
          Aucune saga pour l&apos;instant. Créez-en une avec « Nouvelle saga », ou importez votre
          export Goodreads : les séries y sont reconnues.
        </p>
      ) : (
        <ul className="space-y-4">
          {series.map((entry) => (
            <li key={entry.name} className="card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-xl text-stone-900">{entry.name}</h2>
                  <p className="text-sm text-stone-500 tabular-nums">
                    {entry.finished} lu{entry.finished > 1 ? "s" : ""}
                    {entry.total
                      ? ` sur ${entry.total}`
                      : ` sur ${entry.books.length} en bibliothèque`}
                  </p>
                </div>
                <SeriesEditor
                  library={editorLibrary}
                  existingNames={existingNames}
                  previousName={entry.name}
                  initial={{
                    name: entry.name,
                    total: entry.total,
                    volumes: entry.books.map((volume) => ({
                      bookId: volume.id,
                      seriesIndex: volume.seriesIndex,
                    })),
                  }}
                  triggerLabel="Modifier"
                  triggerVariant="ghost"
                  triggerClassName="shrink-0 px-3"
                />
              </div>

              {/* Défilement horizontal bord à bord sur mobile : la carte ne coupe pas le
                  dernier tome au milieu, il dépasse jusqu'au bord de l'écran. */}
              <ul className="-mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pt-1 pb-3 sm:-mx-6 sm:px-6">
                {entry.books.map((volume) => (
                  <li key={volume.id} className="w-[5.5rem] shrink-0 sm:w-24">
                    <Link href={`/books/${volume.id}`} className="block" title={volume.title}>
                      <BookCover
                        coverUrl={volume.coverUrl}
                        alt={volume.title}
                        author={volume.author}
                        tactile
                        className={`aspect-[2/3] w-full rounded-[var(--radius-sm)] ${volume.status === "TO_READ" ? "opacity-70" : ""}`}
                      />
                      <p className="mt-2 text-xs font-medium text-stone-700">
                        {volume.seriesIndex !== null ? `Tome ${volume.seriesIndex}` : "Hors série"}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-stone-500">
                        <span
                          className={`size-1.5 rounded-full ${STATUS[volume.status].dot}`}
                          aria-hidden="true"
                        />
                        {STATUS[volume.status].label}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-sm text-stone-700">
                {entry.next === null ? (
                  "Saga terminée."
                ) : entry.next.book ? (
                  <>
                    Prochain :{" "}
                    <Link
                      href={`/books/${entry.next.book.id}`}
                      className="font-medium underline underline-offset-2"
                    >
                      {entry.next.index !== null ? `tome ${entry.next.index}, ` : ""}
                      {entry.next.book.title}
                    </Link>
                  </>
                ) : (
                  `Prochain : tome ${entry.next.index}, pas encore dans votre bibliothèque.`
                )}
              </p>
              <SeriesCompletion name={entry.name} isPremium={plan.isPremium} />
            </li>
          ))}
        </ul>
      )}

      {!plan.isPremium && (
        <PremiumTeaser
          className="mt-4"
          trialAvailable={plan.trialAvailable}
          title={
            detected.length > 0
              ? `Premium a repéré ${detected.length === 1 ? "une saga" : `${detected.length} sagas`} dans votre bibliothèque`
              : "Des sagas complètes, sans rien chercher"
          }
          description="Avec Premium, BookList repère vos sagas, trouve les tomes qui vous manquent et les ajoute à votre pile en un clic."
        />
      )}
    </main>
  );
}
