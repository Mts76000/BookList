import Link from "next/link";
import type { PaymentRow } from "@/lib/admin-stripe";
import { formatMoney } from "@/app/admin/admin-ui";
import { RefundButton } from "@/app/admin/refund-button";

function statusOf(payment: PaymentRow): { label: string; className: string } {
  if (payment.refunded) return { label: "Remboursé", className: "bg-stone-100 text-stone-500" };
  if (payment.amountRefunded > 0)
    return { label: "Remboursé en partie", className: "bg-stone-100 text-stone-600" };
  if (payment.status === "succeeded")
    return { label: "Payé", className: "bg-moss-100 text-moss-800" };
  if (payment.status === "failed")
    return { label: "Échec", className: "bg-amber-100 text-amber-700" };
  return { label: "En attente", className: "bg-stone-100 text-stone-600" };
}

/**
 * Liste de paiements en cartes empilées : lisible sur téléphone, où un tableau à cinq
 * colonnes déborderait.
 */
export function PaymentList({
  payments,
  showCustomer = true,
}: {
  payments: PaymentRow[];
  showCustomer?: boolean;
}) {
  if (payments.length === 0) {
    return <p className="p-5 text-sm text-stone-500">Aucun paiement pour l&apos;instant.</p>;
  }

  return (
    <ul className="divide-y divide-stone-100">
      {payments.map((payment) => {
        const status = statusOf(payment);
        const refundable =
          payment.status === "succeeded" ? payment.amount - payment.amountRefunded : 0;
        return (
          <li
            key={payment.id}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
          >
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 sm:items-center">
              <div className="min-w-0">
                <p className="text-base font-semibold text-stone-900 tabular-nums">
                  {formatMoney(payment.amount, payment.currency)}
                  {payment.amountRefunded > 0 && !payment.refunded && (
                    <span className="ml-2 font-sans text-xs text-stone-500">
                      dont {formatMoney(payment.amountRefunded, payment.currency)} remboursés
                    </span>
                  )}
                </p>
                {showCustomer && (
                  <p className="truncate text-sm text-stone-600">
                    {payment.userId ? (
                      <Link href={`/admin/users/${payment.userId}`} className="hover:underline">
                        {payment.userName ?? payment.email}
                      </Link>
                    ) : (
                      (payment.email ?? "Client inconnu")
                    )}
                  </p>
                )}
                <p className="text-xs text-stone-400">
                  {payment.created.toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {payment.failureMessage && ` · ${payment.failureMessage}`}
                </p>
              </div>
              <span className={`badge shrink-0 ${status.className}`}>{status.label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {payment.receiptUrl && (
                <a
                  href={payment.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-stone-600 hover:text-stone-900"
                >
                  Reçu
                </a>
              )}
              {refundable > 0 && (
                <RefundButton chargeId={payment.id} refundableCents={refundable} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
