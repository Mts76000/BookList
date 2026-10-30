import type { Metadata } from "next";
import { getStripe } from "@/lib/stripe";
import { listPayments } from "@/lib/admin-stripe";
import { AdminPageHeader, StatTile, StripeNotConfigured, formatMoney } from "@/app/admin/admin-ui";
import { PaymentList } from "@/app/admin/payment-list";

export const metadata: Metadata = {
  title: "Paiements",
  robots: { index: false, follow: false },
};

function isWithinLastDays(date: Date, days: number): boolean {
  return date.getTime() >= Date.now() - days * 86_400_000;
}

export default async function AdminPaymentsPage() {
  const header = (
    <AdminPageHeader
      title="Paiements"
      subtitle="Les 50 derniers paiements Stripe. Remboursement total ou partiel en un clic."
      breadcrumb={[{ href: "/admin", label: "Administration" }]}
    />
  );
  if (!getStripe()) {
    return (
      <>
        {header}
        <StripeNotConfigured />
      </>
    );
  }

  const payments = await listPayments({ limit: 50 });
  const recent = payments.filter((p) => isWithinLastDays(p.created, 30));
  const collected = recent
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount - p.amountRefunded, 0);
  const refunded = recent.reduce((sum, p) => sum + p.amountRefunded, 0);
  const failed = recent.filter((p) => p.status === "failed").length;

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile
          label="Encaissé"
          value={formatMoney(collected)}
          hint="30 derniers jours, net"
          tone="accent"
        />
        <StatTile label="Remboursé" value={formatMoney(refunded)} hint="30 derniers jours" />
        <StatTile label="Échecs" value={failed} hint="30 derniers jours" />
      </div>
      <section className="card mt-6 overflow-hidden">
        <PaymentList payments={payments} />
      </section>
    </>
  );
}
