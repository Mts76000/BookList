import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, user } from "@/drizzle/schema";
import { auditActionLabel, isAdminAction } from "@/lib/audit-actions";
import { AdminPageHeader } from "@/app/admin/admin-ui";
import { AuditFilter } from "@/app/admin/audit/audit-filter";

export const metadata: Metadata = {
  title: "Journal d'audit",
  robots: { index: false, follow: false },
};

const EVENTS_PER_PAGE = 50;

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("fr-FR");
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const action = params.action;
  const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);

  const filters = action ? eq(auditLogs.action, action) : undefined;

  const [events, [{ value: total }], actionCounts] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
        actorEmail: user.email,
      })
      .from(auditLogs)
      // Jointure externe : l'auteur d'un événement peut avoir été supprimé depuis, la
      // référence passe alors à NULL et l'événement doit rester visible.
      .leftJoin(user, eq(auditLogs.userId, user.id))
      .where(filters)
      .orderBy(desc(auditLogs.createdAt))
      .limit(EVENTS_PER_PAGE)
      .offset((currentPage - 1) * EVENTS_PER_PAGE),
    db.select({ value: count() }).from(auditLogs).where(filters),
    // Le filtre ne propose que les actions réellement journalisées : lister des choix qui
    // ne renvoient rien n'aide personne.
    db
      .select({ action: auditLogs.action, value: count() })
      .from(auditLogs)
      .groupBy(auditLogs.action)
      .orderBy(desc(count())),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / EVENTS_PER_PAGE));
  const options = actionCounts.map((row) => ({
    value: row.action,
    label: auditActionLabel(row.action),
    count: row.value,
  }));

  return (
    <>
      <AdminPageHeader
        title="Journal d'audit"
        subtitle={`${total} événement${total !== 1 ? "s" : ""}${action ? ` pour « ${auditActionLabel(action)} »` : " enregistré(s)"}`}
        breadcrumb={[{ href: "/admin", label: "Administration" }]}
      />

      <div className="mb-4">
        <AuditFilter action={action} options={options} />
      </div>

      {events.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium text-stone-900">Aucun événement</p>
          <p className="mt-1 text-sm text-stone-500">
            {action
              ? "Aucun événement pour cette action."
              : "Les actions sensibles apparaîtront ici au fur et à mesure."}
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3 lg:hidden">
            {events.map((event) => {
              const targetEmail = (event.metadata as { email?: string } | null)?.email;
              return (
                <li key={event.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`status-dot ${isAdminAction(event.action) ? "bg-accent-500" : "bg-stone-300"}`}
                      />
                      <span className="truncate font-medium text-stone-900">
                        {auditActionLabel(event.action)}
                      </span>
                    </span>
                    <time className="shrink-0 text-xs text-stone-400">
                      {formatDateTime(event.createdAt)}
                    </time>
                  </div>
                  <dl className="mt-2 space-y-1 text-xs text-stone-500">
                    <div className="flex gap-2">
                      <dt className="text-stone-400">Auteur</dt>
                      <dd className="truncate">{event.actorEmail ?? "compte supprimé"}</dd>
                    </div>
                    {event.entityType === "user" && event.entityId && (
                      <div className="flex gap-2">
                        <dt className="text-stone-400">Cible</dt>
                        <dd className="min-w-0 truncate">
                          <Link href={`/admin/users/${event.entityId}`} className="link">
                            {targetEmail ?? event.entityId}
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>

          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs tracking-wide text-stone-500 uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Auteur
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cible
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {events.map((event) => {
                  const targetEmail = (event.metadata as { email?: string } | null)?.email;
                  return (
                    <tr key={event.id} className="transition-colors hover:bg-stone-50/70">
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-stone-500">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span
                            className={`status-dot ${isAdminAction(event.action) ? "bg-accent-500" : "bg-stone-300"}`}
                          />
                          {auditActionLabel(event.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {event.actorEmail ?? (
                          <span className="text-stone-400">compte supprimé</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {event.entityType === "user" && event.entityId ? (
                          <Link href={`/admin/users/${event.entityId}`} className="link">
                            {targetEmail ?? event.entityId}
                          </Link>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-400">{event.ip ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
          <PageLink
            page={currentPage - 1}
            action={action}
            disabled={currentPage <= 1}
            label="← Précédent"
          />
          <p className="text-sm text-stone-500">
            Page {currentPage} / {totalPages}
          </p>
          <PageLink
            page={currentPage + 1}
            action={action}
            disabled={currentPage >= totalPages}
            label="Suivant →"
          />
        </nav>
      )}
    </>
  );
}

function PageLink({
  page,
  action,
  disabled,
  label,
}: {
  page: number;
  action?: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-300">
        {label}
      </span>
    );
  }

  const query = new URLSearchParams({ page: String(page) });
  if (action) query.set("action", action);

  return (
    <Link
      href={`/admin/audit?${query}`}
      className="bg-card rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
    >
      {label}
    </Link>
  );
}
