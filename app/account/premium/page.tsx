import type { Metadata } from "next";
import { Crown } from "@phosphor-icons/react/ssr";
import { requireAuthPage } from "@/lib/permissions";
import { countUserQuotes, getUserPlan } from "@/lib/subscription";
import { isBillingEnabled } from "@/lib/stripe";
import { FREE_BOOK_LIMIT, FREE_QUOTE_LIMIT } from "@/lib/plans";
import { PremiumFeatureGrid, PremiumOffer } from "@/components/premium-offer";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { AccountSubpageHeader, UsageMeter } from "@/app/account/account-ui";

export const metadata: Metadata = {
  title: "Premium",
  robots: { index: false, follow: false },
};

function daysLeft(date: Date): number {
  return Math.max(Math.ceil((date.getTime() - Date.now()) / 86_400_000), 1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Page Premium du compte : l'offre et le choix de la formule pour un compte gratuit,
 * l'état de l'abonnement pour un abonné. Stripe Checkout revient ici (`?premium=success`).
 */
export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ premium?: string }>;
}) {
  const session = await requireAuthPage("/account/premium");
  const [plan, quoteCount, { premium: checkoutResult }] = await Promise.all([
    getUserPlan(session.user.id),
    countUserQuotes(session.user.id),
    searchParams,
  ]);

  let status: string | null = null;
  if (plan.isTrial && plan.premiumUntil) {
    const left = daysLeft(plan.premiumUntil);
    status = plan.cancelAtPeriodEnd
      ? `Essai résilié : Premium reste actif jusqu'au ${formatDate(plan.premiumUntil)}, sans aucun prélèvement.`
      : `Essai gratuit : encore ${left} jour${left > 1 ? "s" : ""}. Premier prélèvement le ${formatDate(plan.premiumUntil)} ; résiliez avant pour ne rien payer.`;
  } else if (plan.isGranted && plan.grantedUntil) {
    status = `Premium vous est offert jusqu'au ${formatDate(plan.grantedUntil)}.`;
  } else if (plan.premiumUntil) {
    status = plan.cancelAtPeriodEnd
      ? `Résilié : vos avantages restent actifs jusqu'au ${formatDate(plan.premiumUntil)}.`
      : plan.subscriptionStatus === "past_due"
        ? "Le dernier paiement a échoué : mettez à jour votre moyen de paiement."
        : `Renouvellement le ${formatDate(plan.premiumUntil)}.`;
  }

  return (
    <div>
      <AccountSubpageHeader title="Premium" />

      {checkoutResult === "success" && !plan.isPremium && (
        <p className="border-moss-200 bg-moss-50 text-moss-700 mb-6 rounded-[var(--radius-sm)] border px-4 py-3 text-sm">
          Paiement reçu, merci. Votre abonnement s&apos;active : actualisez la page dans quelques
          secondes.
        </p>
      )}

      {plan.isPremium ? (
        <div className="flex flex-col gap-6">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="bg-accent-50 text-accent-700 flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Crown size={20} weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-stone-900">
                    {checkoutResult === "success" ? "Bienvenue dans Premium" : "BookList Premium"}
                  </h2>
                  {status && <p className="mt-0.5 text-sm text-stone-500">{status}</p>}
                  <p className="mt-1 text-sm text-stone-500">
                    {plan.bookCount} livres et {quoteCount} citations, sans limite.
                  </p>
                </div>
              </div>
              {plan.hasBillingAccount && <ManageBillingButton />}
            </div>
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="font-serif text-xl text-stone-900">Compris dans votre abonnement</h2>
            <div className="mt-6">
              <PremiumFeatureGrid />
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <PremiumOffer billingEnabled={isBillingEnabled()} trialAvailable={plan.trialAvailable} />
          <section className="card space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Votre compte gratuit</h2>
              <p className="mt-0.5 text-sm text-stone-500">
                Une limite atteinte ne retire rien : tout reste consultable et exportable.
              </p>
            </div>
            <UsageMeter label="Livres" used={plan.bookCount} limit={FREE_BOOK_LIMIT} />
            <UsageMeter label="Citations" used={quoteCount} limit={FREE_QUOTE_LIMIT} />
            {plan.hasBillingAccount && <ManageBillingButton />}
          </section>
        </div>
      )}
    </div>
  );
}
