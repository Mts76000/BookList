import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, user } from "@/drizzle/schema";
import { Select } from "@/components/ui/select";

export const metadata: Metadata = {
  title: "Journal d'audit",
  robots: { index: false, follow: false },
};

const EVENTS_PER_PAGE = 50;

/** Actions journalisées, avec un libellé lisible pour le filtre et le tableau. */
const ACTION_LABELS: Record<string, string> = {
  "user.change_password": "Changement de mot de passe",
  "user.delete_account": "Suppression de compte",
  "admin.change_role": "Changement de rôle (admin)",
  "admin.delete_account": "Suppression de compte (admin)",
  "admin.revoke_sessions": "Révocation de sessions (admin)",
};

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

  const filters = and(action ? eq(auditLogs.action, action) : undefined);

  const [events, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
        actorId: auditLogs.userId,
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
  ]);

  const totalPages = Math.max(1, Math.ceil(total / EVENTS_PER_PAGE));

  return (
    <>
      <h1 className="font-serif text-2xl text-stone-900">Journal d&apos;audit</h1>
      <p className="mt-1 text-sm text-stone-500">
        {total} événement{total !== 1 ? "s" : ""} enregistré{total !== 1 ? "s" : ""}.
      </p>

      <form method="get" className="mt-6 max-w-xs">
        <Select label="Filtrer par action" name="action" defaultValue={action ?? ""}>
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <noscript>
          <button type="submit" className="mt-2 text-sm underline">
            Filtrer
          </button>
        </noscript>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
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
                <tr key={event.id} className="hover:bg-stone-50/70">
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-stone-500">
                    {formatDateTime(event.createdAt)}
                  </td>
                  <td className="px-4 py-3">{ACTION_LABELS[event.action] ?? event.action}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {event.actorEmail ?? <span className="text-stone-400">compte supprimé</span>}
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
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-stone-400">
                  Aucun événement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
