import { Books, ChartBar, Compass, Fire, Quotes, Stack, Target } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { PlanPicker } from "@/components/plan-picker";
import { PREMIUM_FEATURES, PREMIUM_PRICES, TRIAL_DAYS } from "@/lib/plans";

const FEATURE_ICONS: Record<(typeof PREMIUM_FEATURES)[number]["title"], Icon> = {
  "Bibliothèque illimitée": Books,
  "Sagas complétées": Stack,
  "Quoi lire ensuite": Compass,
  "Statistiques avancées": ChartBar,
  "Défis personnels": Target,
  "Citations illimitées, en images": Quotes,
  "Jokers de série": Fire,
};

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

/** Tous les avantages Premium, chacun avec son icône. */
export function PremiumFeatureGrid() {
  return (
    <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {PREMIUM_FEATURES.map((feature) => {
        const FeatureIcon = FEATURE_ICONS[feature.title];
        return (
          <li key={feature.title} className="flex gap-3">
            <span className="bg-accent-50 text-accent-700 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]">
              <FeatureIcon size={18} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-stone-900">{feature.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-stone-500">{feature.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Offre Premium d'un compte gratuit : l'accroche, ce que comprend Premium, puis le choix de
 * la formule et un seul bouton. Toutes les invitations à Premium de l'application mènent
 * ici (/account/premium), pour que l'offre se présente toujours de la même façon.
 */
export function PremiumOffer({
  billingEnabled,
  trialAvailable = false,
}: {
  billingEnabled: boolean;
  /** L'essai gratuit est encore disponible pour cet utilisateur. */
  trialAvailable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="noise-overlay relative overflow-hidden rounded-[var(--radius-lg)] bg-stone-900 p-6 text-stone-50 sm:p-8">
        <div className="relative">
          <p className="text-accent-200 text-xs font-medium tracking-wide uppercase">
            BookList Premium
          </p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-balance sm:text-4xl">
            Lisez sans compter.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-300">
            Livres et citations sans limite, et BookList qui travaille pour vous : sagas complétées,
            pile triée selon vos goûts, statistiques détaillées.
          </p>
          <p className="mt-5 text-sm text-stone-400">
            Dès <span className="font-medium text-stone-50">{PREMIUM_PRICES.yearly.perMonth}</span>{" "}
            par mois
            {trialAvailable && <>, {TRIAL_DAYS} jours offerts pour essayer</>}.
          </p>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-serif text-xl text-stone-900">Ce que Premium ajoute</h2>
        <p className="mt-1 text-sm text-stone-500">
          En plus de tout ce que vous faites déjà avec le compte gratuit.
        </p>
        <div className="mt-6">
          <PremiumFeatureGrid />
        </div>
      </section>

      <section id="formule" className="card scroll-mt-20 p-5 sm:p-6">
        <PlanPicker
          billingEnabled={billingEnabled}
          trialAvailable={trialAvailable}
          trialEndsOn={trialEndDate()}
        />
      </section>
    </div>
  );
}
