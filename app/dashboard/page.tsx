import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { ArrowRight, Fire, Quotes } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { book, quote, readingActivity, readingGoal } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getReadingStats } from "@/lib/reading-stats";
import { ContributionGraph } from "@/components/contribution-graph";
import { BookCover } from "@/components/book-cover";
import { AddReadingActivity } from "@/components/add-reading-activity";
import { ReadingGoal } from "@/components/reading-goal";
import { ProgressBar, QuickProgress } from "@/components/reading-progress";
import { NextReads, type NextRead } from "@/components/next-reads";
import { recommendNext } from "@/lib/recommendations";
import { getUserPlan } from "@/lib/subscription";
import { readingStreaks } from "@/lib/advanced-stats";
import { PREMIUM_STREAK_JOKERS } from "@/lib/plans";
import { Onboarding } from "@/components/onboarding";
import { buttonClasses } from "@/components/ui/button";
import { formatRating } from "@/lib/book-status";

// Page privée et personnalisée : rien à y indexer.
export const metadata: Metadata = {
  title: "Accueil",
  robots: { index: false, follow: false },
};

const DAY_MS = 86_400_000;
const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

/** Jour civil au format des activités de lecture (UTC, comme à l'enregistrement). */
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/** Les sept derniers jours, du plus ancien à aujourd'hui, avec les pages lues chacun. */
function lastSevenDays(activities: { date: string; pagesRead: number }[]) {
  const pagesByDay = new Map(activities.map((entry) => [entry.date, entry.pagesRead]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * DAY_MS);
    return {
      key: dayKey(date),
      label: WEEKDAYS[date.getUTCDay()],
      pages: pagesByDay.get(dayKey(date)) ?? 0,
    };
  });
}

/** Pages lues par jour en moyenne sur les 30 derniers jours, jours sans lecture compris. */
function recentPagesPerDay(activities: { date: string; pagesRead: number }[]): number {
  const since = dayKey(new Date(Date.now() - 29 * DAY_MS));
  const total = activities
    .filter((entry) => entry.date >= since)
    .reduce((sum, entry) => sum + entry.pagesRead, 0);
  return total / 30;
}

/** Jours restants avant une date, arrondis au jour supérieur, au moins 1. */
function daysUntil(date: Date): number {
  return Math.max(Math.ceil((date.getTime() - Date.now()) / DAY_MS), 1);
}

/**
 * Accueil : le bureau de lecture. La lecture en cours est mise en avant, avec ce qu'il en
 * reste et un geste pour noter les pages lues ; à côté, la semaine (série et pages du jour)
 * et l'objectif de l'année. Viennent ensuite de quoi enchaîner, l'activité, une citation
 * tirée des notes de l'utilisateur et les derniers livres terminés.
 */
export default async function DashboardPage() {
  const session = await requireAuthPage("/dashboard");
  const user = session.user;
  const year = new Date().getFullYear();

  const [
    currentlyReading,
    recentlyFinished,
    activities,
    stats,
    goal,
    plan,
    libraryBooks,
    [randomQuote],
  ] = await Promise.all([
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
      limit: 6,
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
    // Une citation au hasard parmi celles de l'utilisateur : une bibliothèque personnelle
    // en compte quelques centaines au plus, ORDER BY random() reste négligeable.
    db
      .select({ content: quote.content, bookId: book.id, title: book.title, author: book.author })
      .from(quote)
      .innerJoin(book, eq(book.id, quote.bookId))
      .where(eq(quote.userId, user.id))
      .orderBy(sql`random()`)
      .limit(1),
  ]);

  const firstName = user.name?.split(" ")[0] || "Lecteur";
  const trialDaysLeft = plan.premiumUntil ? daysUntil(plan.premiumUntil) : 0;
  const streaks = readingStreaks(
    activities,
    new Date(),
    plan.isPremium ? PREMIUM_STREAK_JOKERS : 0,
  );

  const week = lastSevenDays(activities);
  const pagesToday = week[6].pages;
  const pagesThisWeek = week.reduce((sum, day) => sum + day.pages, 0);
  const maxWeek = Math.max(...week.map((day) => day.pages), 1);

  // Rythme des 30 derniers jours, pour estimer quand la lecture en cours sera terminée.
  const pagesPerDay = recentPagesPerDay(activities);
  const [featured, ...otherReading] = currentlyReading;
  const pagesLeft =
    featured?.pageCount != null
      ? Math.max(featured.pageCount - (featured.currentPage ?? 0), 0)
      : null;
  const daysToFinish =
    pagesLeft !== null && pagesLeft > 0 && pagesPerDay >= 1
      ? Math.ceil(pagesLeft / pagesPerDay)
      : null;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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

  return (
    <>
      <Onboarding hasSeenOnboarding={user.hasSeenOnboarding} />

      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <header className="mb-6 sm:mb-8">
          <p className="text-sm text-stone-500 first-letter:uppercase">{today}</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl">
            Bonjour {firstName}
          </h1>
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
          {/* Lecture mise en avant */}
          {featured ? (
            <section aria-labelledby="featured-title" className="card overflow-hidden">
              <div className="from-accent-50 flex gap-5 bg-gradient-to-br to-transparent p-5 sm:gap-6 sm:p-6">
                <Link href={`/books/${featured.id}`} className="shrink-0">
                  <BookCover
                    coverUrl={featured.coverUrl}
                    alt={featured.title}
                    author={featured.author}
                    tactile
                    variant="large"
                    className="aspect-[2/3] w-24 rounded-[var(--radius-sm)] sm:w-32"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-accent-700 text-xs font-medium tracking-wide uppercase">
                    En ce moment
                  </p>
                  <Link href={`/books/${featured.id}`} className="mt-1 block">
                    <h2
                      id="featured-title"
                      className="line-clamp-2 font-serif text-xl leading-snug text-stone-900 sm:text-2xl"
                    >
                      {featured.title}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-stone-500">
                      {featured.author}
                      {featured.seriesName &&
                        featured.seriesIndex !== null &&
                        `, ${featured.seriesName} tome ${featured.seriesIndex}`}
                    </p>
                  </Link>
                  <div className="mt-auto pt-4">
                    <ProgressBar
                      currentPage={featured.currentPage}
                      pageCount={featured.pageCount}
                    />
                    {pagesLeft !== null && pagesLeft > 0 && (
                      <p className="mt-1 text-xs text-stone-500">
                        Encore {pagesLeft} pages
                        {daysToFinish !== null &&
                          `, environ ${daysToFinish} jour${daysToFinish > 1 ? "s" : ""} à votre rythme`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
                <QuickProgress
                  bookId={featured.id}
                  currentPage={featured.currentPage}
                  pageCount={featured.pageCount}
                />
              </div>
              {otherReading.length > 0 && (
                <ul className="divide-y divide-stone-100 border-t border-stone-100">
                  {otherReading.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={`/books/${entry.id}`}
                        className="flex items-center gap-4 px-5 py-3 transition hover:bg-stone-50 sm:px-6"
                      >
                        <BookCover
                          coverUrl={entry.coverUrl}
                          alt={entry.title}
                          author={entry.author}
                          className="aspect-[2/3] w-10 shrink-0 rounded-[4px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-900">
                            {entry.title}
                          </p>
                          <ProgressBar
                            currentPage={entry.currentPage}
                            pageCount={entry.pageCount}
                          />
                          {!entry.currentPage && (
                            <p className="text-xs text-stone-500">Pas encore commencé</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="card flex flex-col items-center justify-center p-6 text-center sm:p-8">
              <h2 className="font-serif text-2xl text-stone-900">Que lisez-vous en ce moment ?</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
                {toRead.length > 0
                  ? "Commencez un livre de votre pile, ou ajoutez celui que vous avez en main."
                  : "Scannez ou cherchez le livre que vous avez en main."}
              </p>
              <Link href="/books/add" className={buttonClasses("primary", "mt-5 w-full sm:w-auto")}>
                Ajouter un livre
              </Link>
            </section>
          )}

          {/* La semaine et l'année, à droite sur grand écran */}
          <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-6">
            <section aria-labelledby="week-title" className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="week-title" className="text-sm font-medium text-stone-900">
                    Cette semaine
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500 tabular-nums">
                    {pagesThisWeek} pages, dont {pagesToday} aujourd&apos;hui
                  </p>
                </div>
                <p
                  className="flex items-center gap-1 font-serif text-2xl text-stone-900 tabular-nums"
                  title={
                    plan.isPremium
                      ? `Jokers ce mois-ci : ${PREMIUM_STREAK_JOKERS - streaks.jokersUsedThisMonth} sur ${PREMIUM_STREAK_JOKERS}`
                      : undefined
                  }
                >
                  <Fire
                    className={`h-5 w-5 ${streaks.current > 0 ? "text-accent-500" : "text-stone-300"}`}
                    weight="fill"
                    aria-hidden="true"
                  />
                  {streaks.current}
                  <span className="sr-only"> jours de lecture de suite</span>
                </p>
              </div>
              <ol
                className="mt-4 grid grid-cols-7 gap-1.5"
                aria-label="Lecture des 7 derniers jours"
              >
                {week.map((day, index) => (
                  <li key={day.key} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-14 w-full items-end overflow-hidden rounded-[6px] bg-stone-100">
                      <div
                        className={`w-full rounded-[6px] ${index === 6 ? "bg-accent-500" : "bg-accent-300"}`}
                        style={{
                          height:
                            day.pages > 0 ? `${Math.max((day.pages / maxWeek) * 100, 12)}%` : 0,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[11px] ${index === 6 ? "font-semibold text-stone-900" : "text-stone-400"}`}
                    >
                      {day.label}
                    </span>
                    <span className="sr-only">{day.pages} pages</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-stone-500">
                {pagesToday > 0
                  ? `Journée validée : ${streaks.current} jour${streaks.current > 1 ? "s" : ""} de suite.`
                  : streaks.current > 0
                    ? `Lisez aujourd'hui pour passer à ${streaks.current + 1} jours de suite.`
                    : "Lisez aujourd'hui pour lancer une série."}
              </p>
            </section>

            <section id="objectif" aria-label={`Objectif ${year}`} className="scroll-mt-20">
              <ReadingGoal
                year={year}
                target={goal?.target ?? null}
                booksRead={stats.booksThisYear}
              />
              <Link
                href="/dashboard/stats/bilan"
                className="mt-2 flex items-center justify-end gap-1 text-sm font-medium text-stone-600 transition hover:text-stone-900"
              >
                Voir le bilan {year}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </section>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <NextReads
            books={nextReads.slice(0, 3)}
            isPremium={plan.isPremium}
            title={featured ? "À lire ensuite" : "Dans votre pile"}
          />

          <section className="card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-medium text-stone-900">Pages lues</h2>
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

          {randomQuote && (
            <figure className="card relative overflow-hidden p-6 sm:p-8">
              <Quotes
                className="text-accent-100 absolute -top-2 right-4 h-20 w-20"
                weight="fill"
                aria-hidden="true"
              />
              <blockquote className="relative line-clamp-6 font-serif text-lg leading-relaxed whitespace-pre-line text-stone-800 sm:text-xl">
                {randomQuote.content}
              </blockquote>
              <figcaption className="relative mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm text-stone-500">
                <span>
                  <Link
                    href={`/books/${randomQuote.bookId}`}
                    className="font-medium text-stone-700 hover:underline"
                  >
                    {randomQuote.title}
                  </Link>
                  , {randomQuote.author}
                </span>
                <Link
                  href="/books/citations"
                  className="font-medium text-stone-600 transition hover:text-stone-900"
                >
                  Vos citations
                </Link>
              </figcaption>
            </figure>
          )}

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
              {/* Deux par ligne sur mobile, pour des couvertures lisibles : quatre livres suffisent. */}
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                {recentlyFinished.map((entry, index) => (
                  <li key={entry.id} className={index >= 4 ? "hidden sm:block" : undefined}>
                    <Link href={`/books/${entry.id}`} className="group block" title={entry.title}>
                      <BookCover
                        coverUrl={entry.coverUrl}
                        alt={entry.title}
                        author={entry.author}
                        tactile
                        className="aspect-[2/3] w-full rounded-[var(--radius-sm)]"
                      />
                      {entry.userRating && (
                        <p className="mt-1 flex items-center gap-0.5 text-xs text-stone-500">
                          <StarIcon className="h-3 w-3 text-amber-500" />
                          {formatRating(entry.userRating)}/5
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
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
