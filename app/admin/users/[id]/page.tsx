import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, session as sessionTable, user } from "@/drizzle/schema";
import { requireRole } from "@/lib/permissions";
import { getReadingStats } from "@/lib/reading-stats";
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

  const details = [
    { label: "Identifiant", value: target.id },
    { label: "Rôle", value: target.role === "admin" ? "Administrateur" : "Utilisateur" },
    { label: "E-mail vérifié", value: target.emailVerified ? "Oui" : "Non" },
    { label: "Inscription", value: formatDateTime(target.createdAt) },
    {
      label: "Livres lus avant inscription",
      value: String(target.initialBooksRead),
    },
    {
      label: "Compte supprimé",
      value: target.isAnonymized
        ? `Oui, le ${target.anonymizedAt ? formatDateTime(target.anonymizedAt) : "?"}`
        : "Non",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-stone-900">
            {target.isAnonymized ? "Compte supprimé" : target.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{target.email}</p>
        </div>
        <UserActions
          userId={target.id}
          role={target.role}
          isAnonymized={target.isAnonymized}
          isSelf={target.id === adminSession.user.id}
          activeSessions={sessions.length}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg text-stone-900">Compte</h2>
          <dl className="mt-4 space-y-2 text-sm">
            {details.map((detail) => (
              <div key={detail.label} className="flex justify-between gap-4">
                <dt className="text-stone-500">{detail.label}</dt>
                <dd className="text-right font-medium break-all text-stone-900">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg text-stone-900">Activité de lecture</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Livres", value: stats.totalBooks },
              { label: "Pages", value: stats.totalPagesRead },
              {
                label: "Note moyenne",
                value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—",
              },
              { label: "Notes écrites", value: stats.commentsCount },
            ].map((tile) => (
              <div key={tile.label}>
                <dt className="text-xs text-stone-500">{tile.label}</dt>
                <dd className="font-serif text-xl text-stone-900 tabular-nums">{tile.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg text-stone-900">Sessions actives</h2>
          {sessions.length > 0 ? (
            <ul className="mt-4 divide-y divide-stone-100 text-sm">
              {sessions.map((entry) => (
                <li key={entry.id} className="py-2">
                  <p className="truncate text-stone-700">{entry.userAgent ?? "Appareil inconnu"}</p>
                  <p className="text-xs text-stone-400">
                    {entry.ipAddress ?? "IP inconnue"} · ouverte le{" "}
                    {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone-400">Aucune session active.</p>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg text-stone-900">Événements récents</h2>
          {events.length > 0 ? (
            <ul className="mt-4 divide-y divide-stone-100 text-sm">
              {events.map((event) => (
                <li key={event.id} className="flex justify-between gap-3 py-2">
                  <span className="text-stone-700">{event.action}</span>
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
