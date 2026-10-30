import { CaretDown, CheckCircle } from "@phosphor-icons/react/ssr";
import { PlanPicker } from "@/components/plan-picker";
import { PREMIUM_FEATURES, TRIAL_DAYS } from "@/lib/plans";

interface PremiumOfferProps {
  billingEnabled: boolean;
  /** L'essai gratuit est encore disponible pour cet utilisateur. */
  trialAvailable?: boolean;
  /** Titre de l'encart, adapté à l'endroit où il s'affiche. */
  title?: string;
  description?: string;
}

/**
 * Fin de l'essai s'il commençait aujourd'hui, formatée côté serveur : la même date au
 * rendu et à l'hydratation.
 */
function trialEndDate(): string {
  return new Date(Date.now() + TRIAL_DAYS * 86_400_000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

/** Avantages mis en avant ; les autres restent à un clic. */
const HIGHLIGHTED = 3;

/**
 * Encart d'abonnement pour un utilisateur connecté : les avantages principaux, le reste
 * dépliable, puis le choix de la formule et un seul bouton. Réutilisé sur la page du compte
 * et les statistiques, pour que l'offre se présente toujours de la même façon.
 */
export function PremiumOffer({
  billingEnabled,
  trialAvailable = false,
  title = "Passez à Premium",
  description,
}: PremiumOfferProps) {
  const trialEndsOn = trialEndDate();
  const [highlighted, others] = [
    PREMIUM_FEATURES.slice(0, HIGHLIGHTED),
    PREMIUM_FEATURES.slice(HIGHLIGHTED),
  ];

  const featureItem = (feature: (typeof PREMIUM_FEATURES)[number]) => (
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
  );

  return (
    <div className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-stone-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        <ul className="mt-5 space-y-4">{highlighted.map(featureItem)}</ul>
        <details className="group mt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900">
            Tout ce qu&apos;inclut Premium ({PREMIUM_FEATURES.length})
            <CaretDown
              className="h-4 w-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="mt-2 space-y-4">{others.map(featureItem)}</ul>
        </details>
      </div>
      <div className="border-t border-stone-200 bg-stone-50/60 p-5 sm:p-6">
        <PlanPicker
          billingEnabled={billingEnabled}
          trialAvailable={trialAvailable}
          trialEndsOn={trialEndsOn}
        />
      </div>
    </div>
  );
}
