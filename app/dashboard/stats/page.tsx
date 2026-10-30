import type { Metadata } from "next";
import { ChartBar, Fire, Hourglass, Star, Books, LockSimple } from "@phosphor-icons/react/ssr";
import { requireAuthPage } from "@/lib/permissions";
import { getUserPlan } from "@/lib/subscription";
import { getAdvancedStats, type AdvancedStats } from "@/lib/advanced-stats";
import { isBillingEnabled } from "@/lib/stripe";
import { PremiumOffer } from "@/components/premium-offer";
import { StatsTabs } from "@/components/stats-tabs";
import { PREMIUM_STREAK_JOKERS } from "@/lib/plans";
import { getReadingStats, type ReadingStats } from "@/lib/reading-stats";

export const metadata: Metadata = {
  title: "Statistiques",
  robots: { index: false, follow: false },
};

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function plural(count: number, word: string): string {
  return `${count.toLocaleString("fr-FR")} ${word}${count > 1 ? "s" : ""}`;
}

export default async function StatsPage() {
  const session = await requireAuthPage("/dashboard/stats");
  const [plan, lifetime] = await Promise.all([
    getUserPlan(session.user.id),
    getReadingStats(session.user.id, session.user.initialBooksRead),
  ]);
  const year = new Date().getFullYear();

  return (
    <main
      id="main-content"
      className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <StatsTabs active="/dashboard/stats" />

      <header className="mb-8">
        <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">Vos lectures en détail</h1>
      </header>

      {plan.isPremium ? (
        <StatsContent
          stats={await getAdvancedStats(session.user.id, year, PREMIUM_STREAK_JOKERS)}
        />
      ) : (
        <StatsPreview
          stats={await getAdvancedStats(session.user.id, year)}
          billingEnabled={isBillingEnabled()}
          trialAvailable={plan.trialAvailable}
        />
      )}

      <LifetimeStats
        stats={lifetime}
        memberSince={new Date(session.user.createdAt).toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        })}
      />
    </main>
  );
}

/**
 * Aperçu pour un compte gratuit : quelques vrais chiffres (série, pile à lire, genre favori)
 * et la silhouette de l'année mois par mois, sans les valeurs. Seul ce qui est affiché part
 * au navigateur : le reste des statistiques n'y est jamais envoyé.
 */
function StatsPreview({
  stats,
  billingEnabled,
  trialAvailable,
}: {
  stats: AdvancedStats;
  billingEnabled: boolean;
  trialAvailable: boolean;
}) {
  const maxBooks = Math.max(...stats.months.map((m) => m.books), 1);
  const [topGenre] = stats.genres;
  const locked = (
    <span className="flex items-center gap-1.5 text-sm text-stone-400">
      <LockSimple size={14} aria-hidden="true" />
      Premium
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card p-4 sm:p-5">
          <Fire className="text-accent-600 h-5 w-5" weight="duotone" aria-hidden="true" />
          <p className="mt-3 font-serif text-2xl text-stone-900 tabular-nums">
            {plural(stats.currentStreak, "jour")}
          </p>
          <p className="mt-1 text-xs font-medium text-stone-700 sm:text-sm">Série en cours</p>
        </div>
        <div className="card p-4 sm:p-5">
          <ChartBar className="text-accent-600 h-5 w-5" weight="duotone" aria-hidden="true" />
          <p className="mt-3 font-serif text-2xl text-stone-900 tabular-nums">
            {plural(stats.byStatus.toRead, "livre")}
          </p>
          <p className="mt-1 text-xs font-medium text-stone-700 sm:text-sm">Pile à lire</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
            <LockSimple size={12} aria-hidden="true" />
            Temps pour la finir
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <Hourglass className="h-5 w-5 text-stone-300" weight="duotone" aria-hidden="true" />
          <div className="mt-3">{locked}</div>
          <p className="mt-1 text-xs font-medium text-stone-700 sm:text-sm">
            Durée moyenne d&apos;un livre
          </p>
        </div>
        <div className="card p-4 sm:p-5">
          <Books className="h-5 w-5 text-stone-300" weight="duotone" aria-hidden="true" />
          <div className="mt-3">{locked}</div>
          <p className="mt-1 text-xs font-medium text-stone-700 sm:text-sm">Longueur moyenne</p>
        </div>
      </div>

      <section className="card p-4 sm:p-6">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium text-stone-900">
            Votre année {stats.year}, mois par mois
          </h2>
          {locked}
        </div>
        <div className="flex h-36 items-end gap-[2px] sm:gap-2" aria-hidden="true">
          {stats.months.map((month) => (
            <div
              key={month.month}
              className={`flex-1 rounded-t-[4px] ${month.books > 0 ? "bg-accent-200" : "bg-stone-100"}`}
              style={{ height: month.books > 0 ? `${(month.books / maxBooks) * 80}%` : "3px" }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-[2px] sm:gap-2" aria-hidden="true">
          {MONTH_LABELS.map((label, index) => (
            <span key={index} className="flex-1 text-center text-[10px] text-stone-400">
              {label}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-stone-500">
          {topGenre
            ? `Votre genre favori : ${topGenre.genre}. Le détail de vos genres, de vos notes et de vos auteurs est réservé à Premium.`
            : "Le détail de vos genres, de vos notes et de vos auteurs est réservé à Premium."}
        </p>
      </section>

      <PremiumOffer
        billingEnabled={billingEnabled}
        trialAvailable={trialAvailable}
        title="Débloquez vos statistiques détaillées"
        description="Chaque mois chiffré, vos genres et vos notes, vos auteurs, votre rythme et le temps qu'il vous faudrait pour finir votre pile à lire."
      />
    </div>
  );
}

function StatsContent({ stats }: { stats: AdvancedStats }) {
  const maxBooks = Math.max(...stats.months.map((m) => m.books), 1);
  const maxRatings = Math.max(...stats.ratings, 1);
  const maxGenre = Math.max(...stats.genres.map((g) => g.count), 1);
  const totalYear = stats.months.reduce((sum, m) => sum + m.books, 0);
  const currentMonth = new Date().getMonth();

  const tiles = [
    {
      icon: Fire,
      label: "Série en cours",
      value: plural(stats.currentStreak, "jour"),
      detail: `Record : ${plural(stats.longestStreak, "jour")}, jokers utilisés ce mois : ${stats.jokersUsedThisMonth}/${PREMIUM_STREAK_JOKERS}`,
    },
    {
      icon: Hourglass,
      label: "Durée moyenne d'un livre",
      value: stats.averageDaysPerBook !== null ? plural(stats.averageDaysPerBook, "jour") : "—",
      detail: "Entre la date de début et de fin",
    },
    {
      icon: Books,
      label: "Longueur moyenne",
      value: stats.averagePages !== null ? `${stats.averagePages} pages` : "—",
      detail: "Sur vos livres terminés",
    },
    {
      icon: ChartBar,
      label: "Pile à lire",
      value: plural(stats.byStatus.toRead, "livre"),
      detail:
        stats.backlogMonths !== null
          ? `Environ ${stats.backlogMonths} mois au rythme actuel`
          : "Terminez des livres pour estimer",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4 sm:p-5">
            <tile.icon className="text-accent-600 h-5 w-5" weight="duotone" aria-hidden="true" />
            <p className="mt-3 font-serif text-2xl text-stone-900 tabular-nums">{tile.value}</p>
            <p className="mt-1 text-xs font-medium text-stone-700 sm:text-sm">{tile.label}</p>
            <p className="mt-0.5 text-xs text-stone-400">{tile.detail}</p>
          </div>
        ))}
      </div>

      <section className="card p-4 sm:p-6">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium text-stone-900">
            Livres terminés par mois en {stats.year}
          </h2>
          <p className="text-xs text-stone-500">
            {totalYear > 0
              ? `${plural(totalYear, "livre")} au total`
              : "Aucun livre terminé pour l'instant"}
          </p>
        </div>
        <div className="flex h-44 items-end gap-[2px] sm:gap-2">
          {stats.months.map((month) => (
            <div
              key={month.month}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-[var(--radius-sm)] bg-stone-900 px-2 py-1 text-[11px] whitespace-nowrap text-stone-50 opacity-0 transition-opacity group-hover:opacity-100">
                {MONTH_NAMES[month.month]} : {plural(month.books, "livre")}, {month.pages} p.
              </span>
              {month.books > 0 && (
                <span className="mb-1 text-center text-[11px] font-medium text-stone-600 tabular-nums">
                  {month.books}
                </span>
              )}
              <div
                className={`w-full rounded-t-[4px] transition-colors ${
                  month.books > 0
                    ? "bg-accent-400 group-hover:bg-accent-600"
                    : month.month <= currentMonth
                      ? "bg-stone-100"
                      : "bg-stone-50"
                }`}
                style={{ height: month.books > 0 ? `${(month.books / maxBooks) * 80}%` : "3px" }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-[2px] sm:gap-2" aria-hidden="true">
          {MONTH_LABELS.map((label, index) => (
            <span key={index} className="flex-1 text-center text-[10px] text-stone-400">
              {label}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>Livres terminés par mois en {stats.year}</caption>
          <tbody>
            {stats.months.map((month) => (
              <tr key={month.month}>
                <th scope="row">{MONTH_NAMES[month.month]}</th>
                <td>{plural(month.books, "livre")}</td>
                <td>{month.pages} pages</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-6">
          <h2 className="mb-5 text-sm font-medium text-stone-900">Vos genres</h2>
          {stats.genres.length > 0 ? (
            <ul className="space-y-3">
              {stats.genres.map((entry) => (
                <li key={entry.genre}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="truncate text-stone-700">{entry.genre}</span>
                    <span className="text-stone-500 tabular-nums">{entry.count}</span>
                  </div>
                  <div
                    className="bg-accent-400 h-2 rounded-r-[4px]"
                    style={{ width: `${Math.max((entry.count / maxGenre) * 100, 3)}%` }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">
              Ajoutez des genres à vos livres pour les voir ici.
            </p>
          )}
        </section>

        <section className="card p-4 sm:p-6">
          <h2 className="mb-5 text-sm font-medium text-stone-900">Vos notes</h2>
          {stats.ratings.some((count) => count > 0) ? (
            <ul className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratings[rating - 1];
                return (
                  <li key={rating} className="flex items-center gap-3">
                    <span className="flex w-10 shrink-0 items-center gap-1 text-sm text-stone-700">
                      {rating}
                      <Star
                        className="h-3.5 w-3.5 text-amber-500"
                        weight="fill"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="h-2 flex-1">
                      <div
                        className="bg-accent-400 h-full rounded-r-[4px]"
                        style={{
                          width: count > 0 ? `${Math.max((count / maxRatings) * 100, 3)}%` : "0",
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm text-stone-500 tabular-nums">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">
              Notez vos lectures pour voir votre répartition.
            </p>
          )}
        </section>
      </div>

      {stats.topAuthors.length > 0 && (
        <section className="card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium text-stone-900">Vos auteurs</h2>
          <ol className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {stats.topAuthors.map((entry, index) => (
              <li key={entry.author} className="flex items-baseline gap-3 text-sm">
                <span className="font-serif text-stone-400 tabular-nums">{index + 1}</span>
                <span className="flex-1 truncate text-stone-900">{entry.author}</span>
                <span className="text-stone-500 tabular-nums">{plural(entry.count, "livre")}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/**
 * Le bilan depuis l'inscription, accessible à tous : ces chiffres figuraient sur la page du
 * compte, où ils n'avaient pas leur place à côté des réglages.
 */
function LifetimeStats({ stats, memberSince }: { stats: ReadingStats; memberSince: string }) {
  const maxPages = Math.max(...stats.pagesPerYear.map((entry) => entry.pages), 1);
  const tiles = [
    { label: "Livres lus", value: stats.totalBooks.toLocaleString("fr-FR") },
    { label: "Pages lues", value: stats.totalPagesRead.toLocaleString("fr-FR") },
    {
      label: "Note moyenne",
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1).replace(".", ",") : "—",
    },
    { label: "Notes écrites", value: stats.commentsCount.toLocaleString("fr-FR") },
  ];

  return (
    <section className="mt-10 border-t border-stone-200 pt-8">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl text-stone-900">Depuis vos débuts</h2>
        <p className="text-sm text-stone-500">Membre depuis {memberSince}</p>
      </div>

      <div className="card p-4 sm:p-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label}>
              <dt className="text-xs text-stone-500">{tile.label}</dt>
              <dd className="mt-0.5 font-serif text-2xl text-stone-900 tabular-nums">
                {tile.value}
              </dd>
            </div>
          ))}
        </dl>

        {(stats.topAuthors[0] || stats.topGenres[0]) && (
          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2">
            {stats.topAuthors[0] && (
              <div>
                <dt className="text-xs text-stone-500">Auteur le plus lu</dt>
                <dd className="font-medium text-stone-900">
                  {stats.topAuthors[0].author}{" "}
                  <span className="text-sm font-normal text-stone-500">
                    ({plural(stats.topAuthors[0].count, "livre")})
                  </span>
                </dd>
              </div>
            )}
            {stats.topGenres[0] && (
              <div>
                <dt className="text-xs text-stone-500">Genre préféré</dt>
                <dd className="font-medium text-stone-900">{stats.topGenres[0]}</dd>
              </div>
            )}
          </dl>
        )}

        {stats.pagesPerYear.length > 0 && (
          <div className="mt-6 border-t border-stone-100 pt-6">
            <h3 className="mb-3 text-xs text-stone-500">Pages lues par année</h3>
            <ul className="space-y-2">
              {stats.pagesPerYear.map((entry) => (
                <li key={entry.year} className="flex items-center gap-3">
                  <span className="w-10 text-xs text-stone-500 tabular-nums">{entry.year}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <span
                      className="bg-accent-400 block h-full rounded-full"
                      style={{ width: `${Math.max(2, (entry.pages / maxPages) * 100)}%` }}
                    />
                  </span>
                  <span className="w-16 text-right text-xs text-stone-500 tabular-nums">
                    {entry.pages.toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
