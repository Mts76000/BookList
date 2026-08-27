import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, session as sessionTable, user } from "@/drizzle/schema";
import { requireRole } from "@/lib/permissions";
import { getReadingStats } from "@/lib/reading-stats";
import { formatIp, formatUserAgent } from "@/lib/format-session";
import { auditActionLabel, isAdminAction } from "@/lib/audit-actions";
import { AdminPageHeader, RoleBadge, StatTile, StatusBadge } from "@/app/admin/admin-ui";
import { UserActions } from "@/app/admin/users/[id]/user-actions";

export const metadata: Metadata = {
  title: "Fiche utilisateur",
  robots: { index: false, follow: false },
};

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("fr-FR");
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminSession = await requireRole("admin");

  const target = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!target) notFound();

  const [stats, sessions, events] = await Promise.all([
    getReadingStats(target.id, target.initialBooksRead),
    db.query.session.findMany({
      where: eq(sessionTable.userId, target.id),
      orderBy: [desc(sessionTable.createdAt)],
      limit: 10,
    }),
    db.query.auditLogs.findMany({
      where: eq(auditLogs.entityId, target.id),
      orderBy: [desc(auditLogs.createdAt)],
      limit: 10,
    }),
  ]);

  const displayName = target.isAnonymized ? "Compte supprimé" : target.name;

  return (
    <>
      <AdminPageHeader
        title={displayName}
        subtitle={target.email}
        breadcrumb={[
          { href: "/admin", label: "Administration" },
          { href: "/admin/users", label: "Utilisateurs" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <RoleBadge role={target.role} />
        <StatusBadge isAnonymized={target.isAnonymized} emailVerified={target.emailVerified} />
        <span className="text-xs text-stone-400">
          Inscrit le {formatDateTime(target.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile label="Livres" value={stats.totalBooks} />
        <StatTile label="Pages lues" value={stats.totalPagesRead} />
        <StatTile
          label="Note moyenne"
          value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
        />
        <StatTile label="Notes écrites" value={stats.commentsCount} />
      </div>

      {/* Les actions sont placées après les chiffres, et non dans l'en-tête : on décide de
          promouvoir ou de supprimer un compte après avoir vu ce qu'il contient. */}
      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="font-serif text-lg text-stone-900">Actions</h2>
        <p className="mt-1 mb-4 text-sm text-stone-500">
          Chaque action est enregistrée dans le journal d&apos;audit.
        </p>
        <UserActions
          userId={target.id}
          role={target.role}
          isAnonymized={target.isAnonymized}
          isSelf={target.id === adminSession.user.id}
          activeSessions={sessions.length}
        />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg text-stone-900">Détails du compte</h2>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              { label: "Identifiant", value: target.id },
              { label: "Livres lus avant inscription", value: String(target.initialBooksRead) },
              { label: "Accueil des nouveaux vu", value: target.hasSeenOnboarding ? "Oui" : "Non" },
              {
                label: "Supprimé le",
                value: target.anonymizedAt ? formatDateTime(target.anonymizedAt) : "—",
              },
            ].map((detail) => (
              <div key={detail.label} className="flex justify-between gap-4">
                <dt className="shrink-0 text-stone-500">{detail.label}</dt>
                <dd className="min-w-0 truncate text-right font-medium text-stone-900">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg text-stone-900">
            Sessions actives
            {sessions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-stone-400">({sessions.length})</span>
            )}
          </h2>
          {sessions.length > 0 ? (
            <ul className="mt-4 divide-y divide-stone-100 text-sm">
              {sessions.map((entry) => (
                <li key={entry.id} className="py-2.5">
                  <p className="truncate text-stone-700">{formatUserAgent(entry.userAgent)}</p>
                  <p className="text-xs text-stone-400">
                    {formatIp(entry.ipAddress)} · ouverte le {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone-400">
              Aucune session active : cet utilisateur n&apos;est connecté nulle part.
            </p>
          )}
        </section>

        <section className="card p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-serif text-lg text-stone-900">Événements récents</h2>
          {events.length > 0 ? (
            <ul className="mt-4 divide-y divide-stone-100 text-sm">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`status-dot ${isAdminAction(event.action) ? "bg-accent-500" : "bg-stone-300"}`}
                    />
                    <span className="truncate text-stone-700">
                      {auditActionLabel(event.action)}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-stone-400">
                    {formatDateTime(event.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone-400">Aucun événement enregistré.</p>
          )}
        </section>
      </div>
    </>
  );
}
