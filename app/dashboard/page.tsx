import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, readingActivity } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getReadingStats } from "@/lib/reading-stats";
import { ContributionGraph } from "@/components/contribution-graph";
import { BookCover } from "@/components/book-cover";
import { AddReadingActivity } from "@/components/add-reading-activity";
import { Onboarding } from "@/components/onboarding";
import { buttonClasses } from "@/components/ui/button";

// Page privée et personnalisée : rien à y indexer.
export const metadata: Metadata = {
  title: "Accueil",
  robots: { index: false, follow: false },
};

function formatDate(value: Date | null): string {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "?";
}

export default async function DashboardPage() {
  const session = await requireAuthPage("/dashboard");
  const user = session.user;

  const [recentBooks, currentlyReading, activities, stats] = await Promise.all([
    db.query.book.findMany({
      where: eq(book.userId, user.id),
      orderBy: [desc(book.userEndDate)],
      limit: 5,
    }),
    db.query.book.findMany({
      where: and(eq(book.userId, user.id), eq(book.status, "READING")),
      orderBy: [desc(book.userStartDate)],
      limit: 2,
    }),
    db.query.readingActivity.findMany({
      where: eq(readingActivity.userId, user.id),
      columns: { date: true, pagesRead: true },
    }),
    getReadingStats(user.id, user.initialBooksRead),
  ]);

  const firstName = user.name?.split(" ")[0] || "Lecteur";

  const summaryTiles = [
    { label: "Livres lus", value: stats.totalBooks },
    { label: "Pages lues", value: stats.totalPagesRead },
    { label: "Cette année", value: stats.booksThisYear },
    {
      label: "Note moyenne",
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—",
    },
  ];

  return (
    <>
      <Onboarding hasSeenOnboarding={user.hasSeenOnboarding} />

      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <header className="mb-8">
          <p className="text-sm font-medium text-stone-500">Bonjour</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight text-stone-900 sm:text-3xl">
            {firstName}
          </h1>
        </header>

        {currentlyReading.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-stone-500">En ce moment</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentlyReading.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/books/${entry.id}`}
                  className="card card-interactive flex gap-5 p-5"
                >
                  <BookCover
                    coverUrl={entry.coverUrl}
                    alt={entry.title}
                    tactile
                    className="h-32 w-[5.5rem] shrink-0 rounded-[var(--radius-sm)]"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <span className="badge bg-accent-50 text-accent-700 w-fit">
                      <span className="status-dot bg-accent-500" />
                      En cours
                    </span>
                    <h3 className="mt-2 truncate font-serif text-lg text-stone-900">
                      {entry.title}
                    </h3>
                    <p className="truncate text-sm text-stone-500">{entry.author}</p>
                    {entry.userStartDate && (
                      <p className="mt-2 text-xs text-stone-400">
                        Commencé le {formatDate(entry.userStartDate)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <AddReadingActivity />
        </section>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {summaryTiles.map((tile) => (
            <div key={tile.label} className="card p-4 sm:p-5">
              <p className="font-serif text-2xl text-stone-900 tabular-nums sm:text-3xl">
                {tile.value}
              </p>
              <p className="mt-1 text-xs text-stone-500 sm:text-sm">{tile.label}</p>
            </div>
          ))}
        </div>

        <section className="card mb-8 p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium text-stone-900">Pages lues par jour</h2>
          <ContributionGraph activities={activities} />
        </section>

        {(stats.topAuthors.length > 0 || stats.topGenres.length > 0) && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-stone-500">Vos tendances</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stats.topAuthors[0] && (
                <div className="card flex items-center gap-4 p-4">
                  <div className="bg-primary text-on-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]">
                    <PenIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-stone-500">Auteur le plus lu</p>
                    <p className="truncate font-medium text-stone-900">
                      {stats.topAuthors[0].author}
                    </p>
                    <p className="text-xs text-stone-400">
                      {stats.topAuthors[0].count} livre{stats.topAuthors[0].count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}
              {stats.topGenres[0] && (
                <div className="card flex items-center gap-4 p-4">
                  <div className="bg-primary text-on-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]">
                    <TagIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-stone-500">Genre préféré</p>
                    <p className="truncate font-medium text-stone-900">{stats.topGenres[0]}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-stone-900">Lectures récentes</h2>
            <Link
              href="/books"
              className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
            >
              Tout voir
            </Link>
          </div>

          {recentBooks.length > 0 ? (
            <div className="space-y-3">
              {recentBooks.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/books/${entry.id}`}
                  className="card card-interactive flex gap-4 p-4"
                >
                  <BookCover
                    coverUrl={entry.coverUrl}
                    alt={entry.title}
                    className="h-24 w-16 shrink-0 rounded-[var(--radius-sm)]"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-stone-900">{entry.title}</h3>
                    <p className="truncate text-sm text-stone-500">{entry.author}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
                      {entry.userRating && (
                        <span className="flex items-center gap-1">
                          <StarIcon className="h-3.5 w-3.5 text-amber-500" />
                          {entry.userRating}/5
                        </span>
                      )}
                      {(entry.userStartDate || entry.userEndDate) && (
                        <span>
                          {formatDate(entry.userStartDate)} — {formatDate(entry.userEndDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-[var(--radius-lg)] border border-dashed border-stone-300 px-6 py-12 text-center">
              <BookIcon className="mx-auto h-10 w-10 text-stone-300" />
              <p className="mt-4 font-medium text-stone-900">Aucun livre pour l&apos;instant</p>
              <p className="mt-1 text-sm text-stone-500">
                Ajoutez votre première lecture pour commencer.
              </p>
              <Link href="/books/add" className={buttonClasses("primary", "mt-6")}>
                Ajouter un livre
              </Link>
            </div>
          )}
        </section>
      </main>

      {/* Réservé au desktop : sur mobile, la barre de navigation basse a déjà un onglet
          « Ajouter », et ce bouton flottant venait recouvrir le pied de page. */}
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

function BookIcon({ className }: { className?: string }) {
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
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
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

function PenIcon({ className }: { className?: string }) {
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
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 12v6.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75V6.75A2.25 2.25 0 015.25 4.5h6.75"
      />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
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
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.182 9.182a2.25 2.25 0 003.182 0l4.318-4.317a2.25 2.25 0 000-3.183L12.659 3.659A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}
