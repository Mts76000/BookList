import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, user } from "@/drizzle/schema";
import { getAdminStats } from "@/lib/admin-stats";
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
  const [stats, latestUsers, latestEvents] = await Promise.all([
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
  ]);

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
