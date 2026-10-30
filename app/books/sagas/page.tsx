import Link from "next/link";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getUserPlan } from "@/lib/subscription";
import { groupSeries } from "@/lib/series";
import { BooksTabs } from "@/components/books-tabs";
import { BookCover } from "@/components/book-cover";
import { PremiumTeaser } from "@/components/premium-teaser";

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

  const books = await db
    .select({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      status: book.status,
      seriesName: book.seriesName,
      seriesIndex: book.seriesIndex,
      seriesTotal: book.seriesTotal,
    })
    .from(book)
    .where(and(eq(book.userId, session.user.id), isNotNull(book.seriesName)));
  const allSeries = groupSeries(books);
  // Aperçu gratuit : la première saga en entier, les autres seulement annoncées. Leur
  // contenu ne quitte pas le serveur.
  const series = plan.isPremium ? allSeries : allSeries.slice(0, 1);
  const lockedCount = allSeries.length - series.length;

  return (
    <main
      id="main-content"
      className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <BooksTabs active="/books/sagas" />

      <header className="mb-6">
        <h1 className="font-serif text-2xl text-stone-900 sm:text-3xl">Vos sagas</h1>
        <p className="mt-1 text-sm text-stone-500">
          Renseignez la série et le numéro du tome en modifiant un livre.
        </p>
      </header>

      {series.length === 0 ? (
        <p className="card p-6 text-center text-sm text-stone-500">
          Aucune saga pour l&apos;instant. Modifiez un livre pour indiquer sa série et son tome, ou
          importez votre export Goodreads : les séries y sont reconnues.
        </p>
      ) : (
        <ul className="space-y-4">
          {series.map((entry) => (
            <li key={entry.name} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl text-stone-900">{entry.name}</h2>
                <p className="text-sm text-stone-500 tabular-nums">
                  {entry.finished} lu{entry.finished > 1 ? "s" : ""}
                  {entry.total
                    ? ` sur ${entry.total}`
                    : ` sur ${entry.books.length} en bibliothèque`}
                </p>
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
            </li>
          ))}
        </ul>
      )}

      {!plan.isPremium && (
        <PremiumTeaser
          className="mt-4"
          trialAvailable={plan.trialAvailable}
          title={
            lockedCount > 0
              ? `${lockedCount} autre${lockedCount > 1 ? "s" : ""} saga${lockedCount > 1 ? "s" : ""} avec Premium`
              : "Toutes vos sagas, tome par tome"
          }
          description="Suivez où vous en êtes de chaque série et le prochain tome à lire, sans rien noter nulle part."
        />
      )}
    </main>
  );
}
