import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { Medal } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { book, readingActivity, readingChallenge, readingGoal } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getUserPlan } from "@/lib/subscription";
import { readingStreaks } from "@/lib/advanced-stats";
import {
  CHALLENGE_KINDS,
  challengeProgress,
  computeBadges,
  type ChallengeKind,
} from "@/lib/challenges";
import { PREMIUM_STREAK_JOKERS } from "@/lib/plans";
import { StatsTabs } from "@/components/stats-tabs";
import { ChallengeForm, DeleteChallengeButton } from "@/components/challenge-form";
import { PremiumTeaser } from "@/components/premium-teaser";

export const metadata: Metadata = {
  title: "Défis",
  robots: { index: false, follow: false },
};

/** Défis proposés en aperçu à un compte gratuit, calculés sur ses vraies lectures. */
const SUGGESTED_CHALLENGES: {
  title: string;
  kind: ChallengeKind;
  target: number;
  filter: string | null;
}[] = [
  { title: "Un classique par mois", kind: "genre", target: 12, filter: "Classique" },
  { title: "Trois pavés cette année", kind: "long_books", target: 3, filter: null },
];

function ChallengeCard({
  title,
  subtitle,
  progress,
  target,
  unit,
  action,
}: {
  title: string;
  subtitle: string;
  progress: number;
  target: number;
  unit: string;
  action?: React.ReactNode;
}) {
  const ratio = Math.min(progress / target, 1);
  return (
    <li className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-stone-900">{title}</p>
          <p className="text-xs text-stone-500">{subtitle}</p>
        </div>
        {action}
      </div>
      <p className="mt-4 font-serif text-2xl text-stone-900 tabular-nums">
        {progress.toLocaleString("fr-FR")}
        <span className="text-base text-stone-400">
          {" "}
          / {target.toLocaleString("fr-FR")} {unit}
        </span>
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(progress, target)}
      >
        <div
          className={`h-full rounded-full ${ratio >= 1 ? "bg-moss-500" : "bg-accent-500"}`}
          style={{ width: `${Math.max(ratio * 100, progress > 0 ? 2 : 0)}%` }}
        />
      </div>
      {ratio >= 1 && <p className="text-moss-700 mt-2 text-xs font-medium">Défi relevé !</p>}
    </li>
  );
}

export default async function ChallengesPage() {
  const session = await requireAuthPage("/dashboard/stats/defis");
  const userId = session.user.id;
  const year = new Date().getFullYear();

  const [plan, books, activities, goal, challenges] = await Promise.all([
    getUserPlan(userId),
    db
      .select({
        author: book.author,
        genre: book.genre,
        pageCount: book.pageCount,
        userRating: book.userRating,
        status: book.status,
        userEndDate: book.userEndDate,
      })
      .from(book)
      .where(eq(book.userId, userId)),
    db
      .select({ date: readingActivity.date, pagesRead: readingActivity.pagesRead })
      .from(readingActivity)
      .where(eq(readingActivity.userId, userId)),
    db.query.readingGoal.findFirst({
      where: and(eq(readingGoal.userId, userId), eq(readingGoal.year, year)),
      columns: { target: true },
    }),
    db.query.readingChallenge.findMany({
      where: and(eq(readingChallenge.userId, userId), eq(readingChallenge.year, year)),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
  ]);

  const streaks = readingStreaks(
    activities,
    new Date(),
    plan.isPremium ? PREMIUM_STREAK_JOKERS : 0,
  );
  const badges = computeBadges({
    books,
    year,
    longestStreak: streaks.longest,
    goal: goal?.target ?? null,
  });
  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <main
      id="main-content"
      className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <StatsTabs active="/dashboard/stats/defis" />

      <header className="mb-8">
        <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">Défis et badges</h1>
      </header>

      <section className="mb-10">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium text-stone-900">Vos défis {year}</h2>
          {plan.isPremium && <ChallengeForm year={year} />}
        </div>

        {!plan.isPremium ? (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SUGGESTED_CHALLENGES.map((challenge) => (
                <ChallengeCard
                  key={challenge.title}
                  title={challenge.title}
                  subtitle="Aperçu, avec vos lectures"
                  progress={challengeProgress({ ...challenge, year }, books)}
                  target={challenge.target}
                  unit={CHALLENGE_KINDS[challenge.kind].unit}
                />
              ))}
            </ul>
            <PremiumTeaser
              className="mt-3"
              trialAvailable={plan.trialAvailable}
              title="Créez vos propres défis"
              description="« Tout Agatha Christie », « un classique par mois », « 3 pavés cet été » : vos règles, votre progression."
            />
          </>
        ) : challenges.length === 0 ? (
          <p className="card p-5 text-sm text-stone-500">
            Aucun défi pour l&apos;instant. Fixez-vous-en un : un genre à explorer, un auteur à
            terminer, un nombre de pavés.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {challenges.map((challenge) => {
              const kind = CHALLENGE_KINDS[challenge.kind as ChallengeKind];
              return (
                <ChallengeCard
                  key={challenge.id}
                  title={challenge.title}
                  subtitle={`${kind?.label ?? ""}${challenge.filter ? ` : ${challenge.filter}` : ""}`}
                  progress={challengeProgress(challenge, books)}
                  target={challenge.target}
                  unit={kind?.unit ?? ""}
                  action={<DeleteChallengeButton id={challenge.id} title={challenge.title} />}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium text-stone-900">Badges</h2>
          <p className="text-xs text-stone-500">
            {earnedCount} sur {badges.length} obtenus
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((badge) => (
            <li
              key={badge.id}
              className={`card flex flex-col items-center p-4 text-center ${badge.earned ? "" : "opacity-70"}`}
            >
              <span
                className={`flex size-12 items-center justify-center rounded-full ${
                  badge.earned ? "bg-accent-500 text-stone-50" : "bg-stone-100 text-stone-400"
                }`}
              >
                <Medal size={24} weight={badge.earned ? "fill" : "regular"} aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-stone-900">{badge.title}</p>
              <p className="mt-0.5 text-xs text-stone-500">{badge.description}</p>
              <p className="mt-2 text-xs text-stone-400 tabular-nums">
                {badge.earned
                  ? "Obtenu"
                  : `${badge.progress.toLocaleString("fr-FR")} / ${badge.target.toLocaleString("fr-FR")}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
