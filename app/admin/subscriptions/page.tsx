import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/ssr";
import {
  SUBSCRIPTION_KIND_LABELS,
  getSubscriptionOverview,
  stripeCustomerUrl,
  type SubscriptionKind,
} from "@/lib/admin-subscriptions";
import { AdminPageHeader, StatTile, SubscriptionBadge } from "@/app/admin/admin-ui";

export const metadata: Metadata = {
  title: "Abonnements",
  robots: { index: false, follow: false },
};

const KINDS = Object.keys(SUBSCRIPTION_KIND_LABELS) as SubscriptionKind[];

function formatDate(value: Date | null): string {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function planLabel(row: { kind: string; interval: string | null }): string {
  if (row.kind === "granted") return "Offert";
  if (row.interval === "yearly") return "Annuelle";
  if (row.interval === "monthly") return "Mensuelle";
  return "—";
}

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const [{ kind }, overview] = await Promise.all([searchParams, getSubscriptionOverview()]);
  const activeKind = KINDS.includes(kind as SubscriptionKind) ? (kind as SubscriptionKind) : null;
  const rows = activeKind ? overview.rows.filter((row) => row.kind === activeKind) : overview.rows;
  const { counts } = overview;

  return (
    <>
      <AdminPageHeader
        title="Abonnements"
        subtitle="Abonnés Stripe, essais en cours et Premium offerts. Ouvrez une fiche pour offrir, résilier ou changer de formule."
        breadcrumb={[{ href: "/admin", label: "Administration" }]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <StatTile
          label="Revenu mensuel"
          value={formatEuros(overview.mrrCents)}
          hint="estimé, hors essais"
          tone="accent"
        />
        <StatTile
          label="Payants"
          value={counts.paying + counts.cancel_scheduled}
          hint={`dont ${counts.cancel_scheduled} résiliation(s) prévue(s)`}
        />
        <StatTile label="Essais" value={counts.trial} hint="en cours" />
        <StatTile label="Impayés" value={counts.past_due} hint="Stripe relance" />
        <StatTile label="Offerts" value={counts.granted} hint="sans facturation" />
      </div>

      <nav
        aria-label="Filtrer par situation"
        className="-mx-4 mt-6 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {[null, ...KINDS].map((entry) => (
          <Link
            key={entry ?? "all"}
            href={entry ? `/admin/subscriptions?kind=${entry}` : "/admin/subscriptions"}
            aria-current={entry === activeKind ? "page" : undefined}
            className={`shrink-0 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              entry === activeKind
                ? "bg-stone-900 text-stone-50"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {entry
              ? `${SUBSCRIPTION_KIND_LABELS[entry]} (${counts[entry]})`
              : `Tous (${overview.rows.length})`}
          </Link>
        ))}
      </nav>

      <section className="card mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">Aucun compte dans cette situation.</p>
        ) : (
          <>
            <ul className="divide-y divide-stone-100 md:hidden">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="flex items-center justify-between gap-3 p-4 active:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{row.name}</p>
                      <p className="truncate text-xs text-stone-500">{row.email}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {planLabel(row)} · jusqu&apos;au {formatDate(row.until)}
                      </p>
                    </div>
                    <SubscriptionBadge kind={row.kind} label={SUBSCRIPTION_KIND_LABELS[row.kind]} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-200 bg-stone-50/60 text-left text-xs text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Compte</th>
                    <th className="px-4 py-3 font-medium">Situation</th>
                    <th className="px-4 py-3 font-medium">Formule</th>
                    <th className="px-4 py-3 font-medium">Jusqu&apos;au</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Stripe</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${row.id}`}
                          className="block min-w-0 hover:underline"
                        >
                          <span className="block truncate font-medium text-stone-900">
                            {row.name}
                          </span>
                          <span className="block truncate text-xs text-stone-500">{row.email}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <SubscriptionBadge
                          kind={row.kind}
                          label={SUBSCRIPTION_KIND_LABELS[row.kind]}
                        />
                      </td>
                      <td className="px-4 py-3 text-stone-600">{planLabel(row)}</td>
                      <td className="px-4 py-3 text-stone-600 tabular-nums">
                        {formatDate(row.until)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.stripeCustomerId && (
                          <a
                            href={stripeCustomerUrl(row.stripeCustomerId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900"
                          >
                            Stripe
                            <ArrowSquareOut size={12} aria-hidden="true" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
