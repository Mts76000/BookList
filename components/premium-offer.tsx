import { CheckCircle } from "@phosphor-icons/react/ssr";
import { UpgradeButton } from "@/components/upgrade-button";
import { PREMIUM_FEATURES, PREMIUM_PRICES, TRIAL_DAYS } from "@/lib/plans";

interface PremiumOfferProps {
  billingEnabled: boolean;
  /** L'essai gratuit est encore disponible pour cet utilisateur. */
  trialAvailable?: boolean;
  /** Titre de l'encart, adapté à l'endroit où il s'affiche. */
  title?: string;
  description?: string;
}

/**
 * Encart d'abonnement pour un utilisateur connecté : avantages et deux formules. Réutilisé
 * sur la page du compte, les statistiques et partout où la limite gratuite est atteinte,
 * pour que l'offre se présente toujours de la même façon.
 */
export function PremiumOffer({
  billingEnabled,
  trialAvailable = false,
  title = "Passez à Premium",
  description,
}: PremiumOfferProps) {
  return (
    <div className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-stone-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PREMIUM_FEATURES.map((feature) => (
            <li key={feature.title} className="flex gap-3">
              <CheckCircle
                className="text-moss-500 mt-0.5 h-5 w-5 shrink-0"
                weight="fill"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-stone-900">{feature.title}</p>
                <p className="text-sm text-stone-500">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {trialAvailable && (
        <p className="border-t border-stone-200 px-5 py-4 text-sm text-stone-600 sm:px-6">
          <span className="font-medium text-stone-900">
            {TRIAL_DAYS} jours d&apos;essai gratuit
          </span>{" "}
          sur les deux formules. Aucun prélèvement avant la fin de l&apos;essai, résiliable en un
          clic.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 border-t border-stone-200 bg-stone-50/60 p-5 sm:grid-cols-2 sm:p-6">
        <div className="flex flex-col gap-3">
          <p className="text-stone-900">
            <span className="font-serif text-2xl">{PREMIUM_PRICES.yearly.amount}</span>{" "}
            <span className="text-sm text-stone-500">{PREMIUM_PRICES.yearly.period}</span>
          </p>
          <p className="text-moss-700 -mt-2 text-xs">{PREMIUM_PRICES.yearly.note}</p>
          <UpgradeButton interval="yearly" billingEnabled={billingEnabled} className="w-full">
            {trialAvailable ? "Essayer, puis annuel" : "Choisir l'annuel"}
          </UpgradeButton>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-stone-900">
            <span className="font-serif text-2xl">{PREMIUM_PRICES.monthly.amount}</span>{" "}
            <span className="text-sm text-stone-500">{PREMIUM_PRICES.monthly.period}</span>
          </p>
          <p className="-mt-2 text-xs text-stone-500">Sans engagement</p>
          <UpgradeButton
            interval="monthly"
            billingEnabled={billingEnabled}
            variant="secondary"
            className="w-full"
          >
            {trialAvailable ? "Essayer, puis mensuel" : "Choisir le mensuel"}
          </UpgradeButton>
        </div>
      </div>
    </div>
  );
}
