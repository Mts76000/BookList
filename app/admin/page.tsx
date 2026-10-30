import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, user } from "@/drizzle/schema";
import { getAdminStats } from "@/lib/admin-stats";
import { getSubscriptionOverview } from "@/lib/admin-subscriptions";
import { AdminPageHeader, RoleBadge, StatTile, StatusBadge } from "@/app/admin/admin-ui";
import { auditActionLabel } from "@/lib/audit-actions";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString("fr-FR");
}

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOverviewPage() {
  const [stats, latestUsers, latestEvents, subscriptions] = await Promise.all([
    getAdminStats(),
    db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
      limit: 5,
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        isAnonymized: true,
        emailVerified: true,
      },
    }),
    db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit: 5,
    }),
    getSubscriptionOverview(),
  ]);
  const payingCount = subscriptions.counts.paying + subscriptions.counts.cancel_scheduled;

  const activeUsers = stats.totalUsers - stats.deletedUsers;

  return (
    <>
      <AdminPageHeader
        title="Vue d'ensemble"
        subtitle={`${activeUsers} compte${activeUsers !== 1 ? "s" : ""} actif${activeUsers !== 1 ? "s" : ""} sur ${stats.totalUsers}, ${stats.totalBooks} livres au total.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile
          label="Comptes actifs"
          value={activeUsers}
          hint={stats.deletedUsers > 0 ? `${stats.deletedUsers} supprimé(s)` : "aucun supprimé"}
        />
        <StatTile
          label="Inscriptions"
          value={stats.newUsersLast30Days}
          hint="sur 30 jours"
          tone={stats.newUsersLast30Days > 0 ? "accent" : "neutral"}
        />
        <StatTile
          label="Livres"
          value={stats.totalBooks}
          hint={`${stats.booksAddedLast30Days} ajouté(s) sur 30 jours`}
        />
        <StatTile
          label="Lecteurs actifs"
          value={stats.activeUsersLast30Days}
          hint="ont ajouté un livre sur 30 jours"
        />
      </div>

      <Link
        href="/admin/subscriptions"
        className="card card-interactive mt-4 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"
      >
        <div>
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">Premium</p>
          <p className="mt-1 text-sm text-stone-700">
            <span className="font-serif text-2xl text-stone-900 tabular-nums">{payingCount}</span>{" "}
            payant{payingCount !== 1 ? "s" : ""}, {subscriptions.counts.trial} en essai,{" "}
            {subscriptions.counts.granted} offert{subscriptions.counts.granted !== 1 ? "s" : ""}
            {subscriptions.counts.past_due > 0 && `, ${subscriptions.counts.past_due} impayé(s)`}
          </p>
        </div>
        <p className="text-accent-600 font-serif text-2xl tabular-nums">
          {(subscriptions.mrrCents / 100).toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}
          <span className="ml-1 font-sans text-sm text-stone-500">/ mois</span>
        </p>
      </Link>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-lg text-stone-900">Derniers inscrits</h2>
            <Link href="/admin/users" className="link shrink-0 text-sm">
              Tout voir
            </Link>
          </div>

          {latestUsers.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {latestUsers.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`/admin/users/${entry.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-3 transition-colors hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">
                        {entry.isAnonymized ? "Compte supprimé" : entry.name}
                      </p>
                      <p className="truncate text-xs text-stone-500">{entry.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {entry.role === "admin" && <RoleBadge role={entry.role} />}
                      <StatusBadge
                        isAnonymized={entry.isAnonymized}
                        emailVerified={entry.emailVerified}
                      />
                      <time className="hidden text-xs text-stone-400 sm:inline">
                        {formatDate(entry.createdAt)}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-stone-400">Aucun utilisateur.</p>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-lg text-stone-900">Activité récente</h2>
            <Link href="/admin/audit" className="link shrink-0 text-sm">
              Tout voir
            </Link>
          </div>

          {latestEvents.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {latestEvents.map((event) => {
                const email = (event.metadata as { email?: string } | null)?.email;
                return (
                  <li key={event.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-stone-700">{auditActionLabel(event.action)}</p>
                      {email ? <p className="truncate text-xs text-stone-400">{email}</p> : null}
                    </div>
                    <time className="shrink-0 text-xs text-stone-400">
                      {formatDateTime(event.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-stone-400">
              Aucun événement enregistré pour l&apos;instant.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
