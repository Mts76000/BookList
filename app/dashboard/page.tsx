import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { ArrowRight, Fire, Target } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { book, pushSubscription, readingActivity, readingGoal } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getReadingStats } from "@/lib/reading-stats";
import { ContributionGraph } from "@/components/contribution-graph";
import { BookCover } from "@/components/book-cover";
import { AddReadingActivity } from "@/components/add-reading-activity";
import { ReadingGoal } from "@/components/reading-goal";
import { ReadingProgress } from "@/components/reading-progress";
import { NextReads, type NextRead } from "@/components/next-reads";
import { GettingStarted } from "@/components/getting-started";
import { recommendNext } from "@/lib/recommendations";
import { getUserPlan } from "@/lib/subscription";
import { readingStreaks } from "@/lib/advanced-stats";
import { PREMIUM_STREAK_JOKERS } from "@/lib/plans";
import { Onboarding } from "@/components/onboarding";
import { buttonClasses } from "@/components/ui/button";

// Page privée et personnalisée : rien à y indexer.
export const metadata: Metadata = {
  title: "Accueil",
  robots: { index: false, follow: false },
};

/** Jours restants avant une date, arrondis au jour supérieur, au moins 1. */
function daysUntil(date: Date): number {
  return Math.max(Math.ceil((date.getTime() - Date.now()) / 86_400_000), 1);
}

/**
 * Accueil : tout part de la lecture en cours. En haut, la série et l'objectif en un coup
 * d'œil ; puis les livres en cours, dont on met la page à jour sans quitter l'écran ; puis
 * de quoi enchaîner. Le reste (activité, année, derniers livres) vient ensuite, et les
 * fonctions Premium n'y apparaissent qu'en discret.
 */
export default async function DashboardPage() {
  const session = await requireAuthPage("/dashboard");
  const user = session.user;
  const year = new Date().getFullYear();

  const [currentlyReading, recentlyFinished, activities, stats, goal, plan, libraryBooks, push] =
    await Promise.all([
      db.query.book.findMany({
        where: and(eq(book.userId, user.id), eq(book.status, "READING")),
        orderBy: [desc(book.updatedAt)],
        limit: 4,
      }),
      db.query.book.findMany({
        where: and(
          eq(book.userId, user.id),
          eq(book.status, "FINISHED"),
          isNotNull(book.userEndDate),
        ),
        orderBy: [desc(book.userEndDate)],
        limit: 4,
      }),
      db.query.readingActivity.findMany({
        where: eq(readingActivity.userId, user.id),
        columns: { date: true, pagesRead: true },
      }),
      getReadingStats(user.id, user.initialBooksRead),
      db.query.readingGoal.findFirst({
        where: and(eq(readingGoal.userId, user.id), eq(readingGoal.year, year)),
        columns: { target: true },
      }),
      getUserPlan(user.id),
      db
        .select({
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          genre: book.genre,
          status: book.status,
          userRating: book.userRating,
          seriesName: book.seriesName,
          seriesIndex: book.seriesIndex,
          currentPage: book.currentPage,
          createdAt: book.createdAt,
        })
        .from(book)
        .where(eq(book.userId, user.id)),
      db.query.pushSubscription.findFirst({
        where: eq(pushSubscription.userId, user.id),
        columns: { id: true },
      }),
    ]);

  const firstName = user.name?.split(" ")[0] || "Lecteur";
  const trialDaysLeft = plan.premiumUntil ? daysUntil(plan.premiumUntil) : 0;
  const streaks = readingStreaks(
    activities,
    new Date(),
    plan.isPremium ? PREMIUM_STREAK_JOKERS : 0,
  );

  // À lire ensuite : classés selon les goûts pour Premium, sinon les derniers ajoutés. Un
  // compte gratuit ne reçoit aucune raison de suggestion : elles ne quittent pas le serveur.
  const toRead = libraryBooks.filter((entry) => entry.status === "TO_READ");
  const nextReads: NextRead[] = plan.isPremium
    ? recommendNext(libraryBooks).map(({ book: entry, reason }) => ({ ...entry, reason }))
    : [];
  for (const entry of [...toRead].sort((a, b) => +b.createdAt - +a.createdAt)) {
    if (nextReads.length >= 3) break;
    if (!nextReads.some((picked) => picked.id === entry.id))
      nextReads.push({ ...entry, reason: null });
  }

  const steps = [
    { label: "Ajouter un premier livre", href: "/books/add", done: libraryBooks.length > 0 },
    {
      label: "Indiquer où vous en êtes d'une lecture",
      href: currentlyReading[0] ? `/books/${currentlyReading[0].id}` : "/books",
      done: libraryBooks.some((entry) => entry.currentPage !== null),
    },
    { label: `Fixer votre objectif ${year}`, href: "#objectif", done: !!goal },
    {
      label: "Importer votre bibliothèque Goodreads ou StoryGraph",
      href: "/books/import",
      done: libraryBooks.length >= 10,
    },
    { label: "Activer les rappels de lecture", href: "/account#rappels", done: !!push },
  ];

  return (
    <>
      <Onboarding hasSeenOnboarding={user.hasSeenOnboarding} />

      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <header className="mb-6">
          <h1 className="text-2xl font-medium tracking-tight text-stone-900 sm:text-3xl">
            Bonjour {firstName}
          </h1>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <span
              className="bg-card flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700"
              title={
                plan.isPremium
                  ? `Jokers ce mois-ci : ${PREMIUM_STREAK_JOKERS - streaks.jokersUsedThisMonth} sur ${PREMIUM_STREAK_JOKERS}`
                  : undefined
              }
            >
              <Fire
                className={`h-4 w-4 ${streaks.current > 0 ? "text-accent-500" : "text-stone-300"}`}
                weight="fill"
                aria-hidden="true"
              />
              {streaks.current > 0
                ? `${streaks.current} jour${streaks.current > 1 ? "s" : ""} de suite`
                : "Lisez aujourd'hui pour lancer une série"}
            </span>
            <a
              href="#objectif"
              className="bg-card flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:border-stone-300"
            >
              <Target className="text-accent-500 h-4 w-4" aria-hidden="true" />
              {goal
                ? `${stats.booksThisYear} / ${goal.target} livres en ${year}`
                : `${stats.booksThisYear} livre${stats.booksThisYear > 1 ? "s" : ""} en ${year}`}
            </a>
          </div>
        </header>

        {plan.isTrial && !plan.cancelAtPeriodEnd && trialDaysLeft <= 3 && (
          <Link
            href="/account#premium"
            className="border-accent-200 bg-accent-50 text-accent-800 mb-6 block rounded-[var(--radius-sm)] border px-4 py-3 text-sm"
          >
            Votre essai Premium se termine dans {trialDaysLeft} jour
            {trialDaysLeft > 1 ? "s" : ""} : l&apos;abonnement démarrera ensuite.{" "}
            <span className="font-medium underline underline-offset-2">Gérer mon abonnement</span>
          </Link>
        )}

        {currentlyReading.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-stone-500">En cours de lecture</h2>
            <ul className="space-y-3">
              {currentlyReading.map((entry) => (
                <li key={entry.id} className="card flex gap-4 p-4">
                  <Link href={`/books/${entry.id}`} className="shrink-0">
                    <BookCover
                      coverUrl={entry.coverUrl}
                      alt={entry.title}
                      tactile
                      className="h-28 w-[4.75rem] rounded-[var(--radius-sm)]"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/books/${entry.id}`} className="block">
                      <h3 className="truncate font-serif text-lg text-stone-900">{entry.title}</h3>
                      <p className="truncate text-sm text-stone-500">
                        {entry.author}
                        {entry.seriesName &&
                          entry.seriesIndex !== null &&
                          `, ${entry.seriesName} tome ${entry.seriesIndex}`}
                      </p>
                    </Link>
                    <ReadingProgress
                      bookId={entry.id}
                      currentPage={entry.currentPage}
                      pageCount={entry.pageCount}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="card mb-8 p-5 text-center sm:p-6">
            <h2 className="font-serif text-xl text-stone-900">Que lisez-vous en ce moment ?</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
              {toRead.length > 0
                ? "Commencez un livre de votre pile, ou ajoutez celui que vous avez en main."
                : "Scannez ou cherchez le livre que vous avez en main."}
            </p>
            <Link href="/books/add" className={buttonClasses("primary", "mt-4 w-full sm:w-auto")}>
              Ajouter un livre
            </Link>
          </section>
        )}

        <NextReads
          books={nextReads.slice(0, 3)}
          isPremium={plan.isPremium}
          title={currentlyReading.length > 0 ? "À lire ensuite" : "Dans votre pile"}
        />

        {/* Guide réservé aux nouveaux venus : une bibliothèque déjà fournie n'en a pas besoin. */}
        {libraryBooks.length < 20 && <GettingStarted steps={steps} />}

        <section className="card mb-8 p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium text-stone-900">Pages lues par jour</h2>
          <ContributionGraph activities={activities} />
          <details className="group mt-4 border-t border-stone-100 pt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-stone-600 hover:text-stone-900">
              Corriger les pages d&apos;une journée
            </summary>
            <div className="pt-2">
              <AddReadingActivity />
            </div>
          </details>
        </section>

        <section id="objectif" className="mb-8 scroll-mt-20">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium text-stone-500">Votre année {year}</h2>
            <Link
              href="/dashboard/stats/bilan"
              className="flex items-center gap-1 text-sm font-medium text-stone-600 transition hover:text-stone-900"
            >
              Voir le bilan
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ReadingGoal year={year} target={goal?.target ?? null} booksRead={stats.booksThisYear} />
        </section>

        {recentlyFinished.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-medium text-stone-500">Terminés récemment</h2>
              <Link
                href="/books?status=FINISHED"
                className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
              >
                Tout voir
              </Link>
            </div>
            <ul className="grid grid-cols-4 gap-3">
              {recentlyFinished.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/books/${entry.id}`} className="group block" title={entry.title}>
                    <BookCover
                      coverUrl={entry.coverUrl}
                      alt={entry.title}
                      tactile
                      className="aspect-[2/3] w-full rounded-[var(--radius-sm)]"
                    />
                    {entry.userRating && (
                      <p className="mt-1 flex items-center gap-0.5 text-xs text-stone-500">
                        <StarIcon className="h-3 w-3 text-amber-500" />
                        {entry.userRating}/5
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* Réservé au desktop : sur mobile, la barre de navigation basse a déjà un onglet
          « Ajouter ». */}
      <Link
        href="/books/add"
        className="bg-primary text-on-primary hover:bg-accent-600 fixed right-8 bottom-8 z-30 hidden h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_24px_-6px_rgba(36,29,21,0.45)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_-8px_rgba(171,79,39,0.45)] active:translate-y-0 active:shadow-none sm:flex"
        aria-label="Ajouter un livre"
      >
        <PlusIcon className="h-6 w-6" />
      </Link>
    </>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
