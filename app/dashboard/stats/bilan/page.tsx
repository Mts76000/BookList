import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthPage } from "@/lib/permissions";
import { getReviewYears, getYearReview } from "@/lib/year-review";
import { YearReviewShare } from "@/components/year-review-share";
import { FavoritePicker } from "@/components/favorite-picker";
import { buttonClasses } from "@/components/ui/button";
import { StatsTabs } from "@/components/stats-tabs";

export const metadata: Metadata = {
  title: "Bilan de lecture",
  robots: { index: false, follow: false },
};

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString("fr-FR")} ${count > 1 ? pluralForm : singular}`;
}

export default async function YearReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await requireAuthPage("/dashboard/stats/bilan");
  const { year: yearParam } = await searchParams;

  const currentYear = new Date().getFullYear();
  const year = yearParam ? Number(yearParam) : currentYear;
  if (!Number.isInteger(year) || year < 1900 || year > currentYear) notFound();

  const [review, years] = await Promise.all([
    getYearReview(session.user.id, year),
    getReviewYears(session.user.id),
  ]);

  const facts = [
    review.topGenre && { label: "Genre préféré", value: review.topGenre },
    review.topAuthor && {
      label: "Auteur le plus lu",
      value: review.topAuthor.name,
      detail: plural(review.topAuthor.count, "livre"),
    },
    review.busiestMonth && {
      label: "Mois le plus lu",
      value: review.busiestMonth.name,
      detail: plural(review.busiestMonth.count, "livre"),
    },
    review.averageRating !== null && {
      label: "Note moyenne",
      value: `${review.averageRating.toLocaleString("fr-FR")} / 5`,
    },
    review.longestBook && {
      label: "Plus long livre",
      value: review.longestBook.title,
      detail: `${review.longestBook.pageCount} pages`,
    },
  ].filter((fact): fact is { label: string; value: string; detail?: string } => !!fact);

  return (
    <main
      id="main-content"
      className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <StatsTabs active="/dashboard/stats/bilan" />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">
            {year === currentYear ? "Votre année jusqu'ici" : "Votre année"}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-stone-900 sm:text-4xl">Bilan {year}</h1>
          <p className="mt-2 max-w-md text-sm text-stone-500">
            Vos lectures de l&apos;année en une image, prête à partager en story ou à envoyer à vos
            proches. Choisissez votre coup de cœur et un style, c&apos;est prêt.
          </p>
        </div>
        {years.length > 1 && (
          <nav
            aria-label="Choisir l'année"
            className="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-0.5"
          >
            {years.map((entry) => (
              <Link
                key={entry}
                href={
                  entry === currentYear
                    ? "/dashboard/stats/bilan"
                    : `/dashboard/stats/bilan?year=${entry}`
                }
                aria-current={entry === year ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition ${
                  entry === year
                    ? "bg-card text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {entry}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {review.booksCount === 0 ? (
        <div className="bg-card rounded-[var(--radius-lg)] border border-dashed border-stone-300 px-6 py-14 text-center">
          <p className="font-medium text-stone-900">Aucun livre terminé en {year}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
            Indiquez une date de fin sur vos lectures terminées : elles apparaîtront ici, avec votre
            image de bilan à partager.
          </p>
          <Link href="/books" className={buttonClasses("primary", "mt-6")}>
            Voir mes livres
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px] lg:gap-12">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="card p-5 sm:p-6">
                <p className="font-serif text-5xl text-stone-900 tabular-nums">
                  {review.booksCount}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {review.booksCount > 1 ? "livres lus" : "livre lu"}
                </p>
              </div>
              <div className="card p-5 sm:p-6">
                <p className="font-serif text-5xl text-stone-900 tabular-nums">
                  {review.pagesCount.toLocaleString("fr-FR")}
                </p>
                <p className="mt-1 text-sm text-stone-500">pages tournées</p>
              </div>
            </div>

            {review.goal !== null && (
              <p className="text-sm text-stone-600">
                {review.booksCount >= review.goal
                  ? `Objectif de ${review.goal} livres atteint. Bravo !`
                  : `Objectif : ${review.booksCount} livres sur ${review.goal}.`}
              </p>
            )}

            <FavoritePicker
              year={year}
              favorite={review.favoriteBook}
              isChosen={review.favoriteChosen}
              candidates={review.finishedBooks}
            />

            {facts.length > 0 && (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-t border-stone-200 pt-4">
                    <dt className="text-xs text-stone-500">{fact.label}</dt>
                    <dd className="mt-1 truncate font-medium text-stone-900">{fact.value}</dd>
                    {fact.detail && <dd className="text-xs text-stone-400">{fact.detail}</dd>}
                  </div>
                ))}
              </dl>
            )}
          </div>

          <aside aria-label="Image à partager" className="order-first lg:order-none">
            <YearReviewShare year={year} favoriteId={review.favoriteBook?.id ?? null} />
          </aside>
        </div>
      )}
    </main>
  );
}
