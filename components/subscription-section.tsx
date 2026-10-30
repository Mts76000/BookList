import { Crown } from "@phosphor-icons/react/ssr";
import type { UserPlan } from "@/lib/subscription";
import { FREE_BOOK_LIMIT } from "@/lib/plans";
import { PremiumOffer } from "@/components/premium-offer";
import { ManageBillingButton } from "@/components/manage-billing-button";

interface SubscriptionSectionProps {
  plan: UserPlan;
  billingEnabled: boolean;
  /** Retour de Stripe Checkout (`?premium=success` ou `cancel`). */
  checkoutResult?: string;
}

function daysLeft(date: Date): number {
  return Math.max(Math.ceil((date.getTime() - Date.now()) / 86_400_000), 1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Bloc « Abonnement » de la page du compte : état Premium, ou offre et jauge gratuite. */
export function SubscriptionSection({
  plan,
  billingEnabled,
  checkoutResult,
}: SubscriptionSectionProps) {
  const usage = Math.min(plan.bookCount / FREE_BOOK_LIMIT, 1);

  return (
    <section id="premium" className="flex scroll-mt-20 flex-col gap-4">
      {checkoutResult === "success" && !plan.isPremium && (
        <p className="border-moss-200 bg-moss-50 text-moss-700 rounded-[var(--radius-sm)] border px-4 py-3 text-sm">
          Paiement reçu, merci ! Votre abonnement s&apos;active : actualisez la page dans quelques
          secondes.
        </p>
      )}

      {plan.isTrial && plan.premiumUntil ? (
        <div className="border-border bg-card rounded-xl border p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="bg-accent-50 text-accent-700 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Crown size={18} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-card-foreground text-base font-semibold">
                  Essai gratuit de Premium
                </h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {plan.cancelAtPeriodEnd
                    ? `Résilié : Premium reste actif jusqu'au ${formatDate(plan.premiumUntil)}, sans aucun prélèvement.`
                    : `Encore ${daysLeft(plan.premiumUntil)} jour${daysLeft(plan.premiumUntil) > 1 ? "s" : ""}. Premier prélèvement le ${formatDate(plan.premiumUntil)} ; résiliez avant pour ne rien payer.`}
                </p>
              </div>
            </div>
            {plan.hasBillingAccount && <ManageBillingButton />}
          </div>
        </div>
      ) : plan.isPremium ? (
        <div className="border-border bg-card rounded-xl border p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="bg-accent-50 text-accent-700 flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Crown size={18} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-card-foreground text-base font-semibold">BookList Premium</h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {checkoutResult === "success" && "Bienvenue dans Premium ! "}
                  {plan.premiumUntil &&
                    (plan.cancelAtPeriodEnd
                      ? `Résilié : vos avantages restent actifs jusqu'au ${formatDate(plan.premiumUntil)}.`
                      : plan.subscriptionStatus === "past_due"
                        ? "Le dernier paiement a échoué : mettez à jour votre moyen de paiement."
                        : `Renouvellement le ${formatDate(plan.premiumUntil)}.`)}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {plan.bookCount} livres en bibliothèque, sans limite.
                </p>
              </div>
            </div>
            {plan.hasBillingAccount && <ManageBillingButton />}
          </div>
        </div>
      ) : (
        <>
          <div className="border-border bg-card rounded-xl border p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-card-foreground text-base font-semibold">
                Votre formule : gratuite
              </h2>
              <p className="text-sm text-stone-500 tabular-nums">
                {plan.bookCount} / {FREE_BOOK_LIMIT} livres
              </p>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"
              role="progressbar"
              aria-label="Livres en bibliothèque"
              aria-valuemin={0}
              aria-valuemax={FREE_BOOK_LIMIT}
              aria-valuenow={Math.min(plan.bookCount, FREE_BOOK_LIMIT)}
            >
              <div
                className={`h-full rounded-full ${usage >= 1 ? "bg-destructive" : usage >= 0.8 ? "bg-accent-600" : "bg-accent-400"}`}
                style={{ width: `${Math.max(usage * 100, plan.bookCount > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-stone-500">
              {plan.remaining > 0
                ? `Encore ${plan.remaining} livre${plan.remaining > 1 ? "s" : ""} avant la limite du compte gratuit. Vos livres restent consultables et exportables quoi qu'il arrive.`
                : "Votre bibliothèque gratuite est pleine. Vos livres restent consultables et exportables ; passez à Premium pour en ajouter d'autres."}
            </p>
            {plan.hasBillingAccount && (
              <div className="mt-4">
                <ManageBillingButton />
              </div>
            )}
          </div>
          <PremiumOffer billingEnabled={billingEnabled} trialAvailable={plan.trialAvailable} />
        </>
      )}
    </section>
  );
}
