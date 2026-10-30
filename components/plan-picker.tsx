"use client";

import { useId, useState } from "react";
import { UpgradeButton } from "@/components/upgrade-button";
import { PREMIUM_PRICES, TRIAL_DAYS, type BillingInterval } from "@/lib/plans";

const PLANS: {
  interval: BillingInterval;
  label: string;
  perMonth: string;
  detail: string;
  badge?: string;
}[] = [
  {
    interval: "yearly",
    label: "Annuel",
    perMonth: PREMIUM_PRICES.yearly.perMonth,
    detail: `${PREMIUM_PRICES.yearly.amount} par an, 4 mois offerts`,
    badge: "Le plus avantageux",
  },
  {
    interval: "monthly",
    label: "Mensuel",
    perMonth: PREMIUM_PRICES.monthly.perMonth,
    detail: "Sans engagement",
  },
];

/**
 * Choix de la formule Premium : deux cartes sélectionnables, puis un seul bouton, et sous
 * celui-ci ce qui se passera exactement (date du premier prélèvement, montant). Remplace
 * les deux boutons « Essayer, puis annuel / mensuel », peu clairs.
 */
export function PlanPicker({
  billingEnabled,
  trialAvailable,
  trialEndsOn,
}: {
  billingEnabled: boolean;
  trialAvailable: boolean;
  /** Date de fin de l'essai s'il commençait aujourd'hui, déjà formatée par le serveur. */
  trialEndsOn: string;
}) {
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const name = useId();
  const price = PREMIUM_PRICES[interval];

  return (
    <div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">
          Choisissez votre formule
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {PLANS.map((plan) => {
            const selected = plan.interval === interval;
            return (
              <label
                key={plan.interval}
                className={`relative flex cursor-pointer flex-col rounded-[var(--radius-md)] border-2 p-3 transition sm:p-4 ${
                  selected
                    ? "border-accent-500 bg-accent-50/60"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={plan.interval}
                  checked={selected}
                  onChange={() => setInterval(plan.interval)}
                  className="sr-only"
                />
                {plan.badge && (
                  <span className="bg-moss-500 absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-[11px] font-medium text-white">
                    {plan.badge}
                  </span>
                )}
                <span className="text-sm font-medium text-stone-900">{plan.label}</span>
                <span className="mt-1 text-stone-900">
                  <span className="font-serif text-2xl">{plan.perMonth}</span>
                  <span className="text-sm text-stone-500"> / mois</span>
                </span>
                <span className="mt-0.5 text-xs text-stone-500">{plan.detail}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <UpgradeButton interval={interval} billingEnabled={billingEnabled} className="mt-4 w-full">
        {trialAvailable ? `Essayer gratuitement ${TRIAL_DAYS} jours` : "Passer à Premium"}
      </UpgradeButton>
      <p className="mt-2 text-center text-xs text-stone-500" aria-live="polite">
        {trialAvailable
          ? `Aucun prélèvement avant le ${trialEndsOn}, puis ${price.amount} ${price.period}. Annulable en un clic, à tout moment.`
          : `${price.amount} ${price.period}. Annulable en un clic, à tout moment.`}
      </p>
    </div>
  );
}
