import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { buttonClasses } from "@/components/ui/button";
import { FREE_BOOK_LIMIT, PREMIUM_FEATURES, PREMIUM_PRICES, TRIAL_DAYS } from "@/lib/plans";

/**
 * Sections publiques partagées par la page d'accueil et la page Tarifs : la grille des deux
 * formules et la foire aux questions. Les questions servent aussi aux données structurées
 * (FAQPage) des deux pages.
 */

export const FREE_FEATURES = [
  `Jusqu'à ${FREE_BOOK_LIMIT} livres ajoutés, import complet`,
  "Scan, recherche et saisie manuelle",
  "Objectif annuel, série de lecture et rappels",
  "Statistiques de base, badges et bilan annuel",
  "Sagas et citations, sans limite",
  "Import Goodreads et StoryGraph",
  "Export de vos données, toujours",
];

export const FAQ = [
  {
    question: "Puis-je essayer Premium avant de payer ?",
    answer: `Oui : ${TRIAL_DAYS} jours d'essai gratuit sur les deux formules. Rien n'est prélevé pendant l'essai, et une résiliation avant la fin ne coûte rien : votre compte repasse simplement en gratuit.`,
  },
  {
    question: `Que se passe-t-il quand j'atteins ${FREE_BOOK_LIMIT} livres ?`,
    answer:
      "Rien ne disparaît : vos livres restent consultables, modifiables et exportables. Seul l'ajout de nouveaux livres un par un demande Premium ; l'import de votre bibliothèque Goodreads ou StoryGraph passe toujours en entier.",
  },
  {
    question: "Puis-je résilier quand je veux ?",
    answer:
      "Oui, en deux clics depuis votre compte. Premium reste actif jusqu'à la fin de la période déjà payée, sans prélèvement ensuite.",
  },
  {
    question: "Le paiement est-il sécurisé ?",
    answer: "Il est géré par Stripe. BookList ne voit ni ne stocke jamais votre numéro de carte.",
  },
  {
    question: "Que faites-vous de mes données ?",
    answer:
      "Rien d'autre que les afficher. Pas de publicité, pas de revente : l'abonnement est la seule source de revenus de BookList.",
  },
];

/** Grille Gratuit / Premium, avec les prix de lib/plans.ts. */
export function PricingSection({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const Heading = headingLevel;
  return (
    <section id="tarifs" className="bg-card scroll-mt-20 border-y border-stone-200/70">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
        <Heading className="font-serif text-3xl text-stone-900 sm:text-4xl">
          {headingLevel === "h1" ? "Tarifs : gratuit pour commencer." : "Gratuit pour commencer."}
        </Heading>
        <p className="mt-3 max-w-xl text-stone-500">
          Le compte gratuit suffit à la plupart des lecteurs. Premium s&apos;adresse à ceux qui
          lisent beaucoup et veulent tout savoir de leurs lectures.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.15fr] md:gap-6">
          <div className="flex flex-col rounded-[var(--radius-lg)] border border-stone-200 bg-stone-50 p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-stone-900">Gratuit</h3>
            <p className="mt-4 text-stone-900">
              <span className="font-serif text-4xl">0 €</span>
              <span className="ml-2 text-sm text-stone-500">pour toujours</span>
            </p>
            <ul className="mt-8 flex-1 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-stone-700">
                  <CheckCircle
                    className="text-moss-500 mt-0.5 h-4 w-4 shrink-0"
                    weight="fill"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/register" className={buttonClasses("secondary", "mt-8 w-full")}>
              Créer un compte gratuit
            </Link>
          </div>

          <div className="noise-overlay relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-stone-900 p-6 text-stone-50 sm:p-8">
            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-serif text-2xl">Premium</h3>
                <span className="bg-accent-500 rounded-full px-3 py-1 text-xs font-medium text-stone-50">
                  4 mois offerts à l&apos;année
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <p>
                  <span className="font-serif text-4xl">{PREMIUM_PRICES.yearly.amount}</span>
                  <span className="ml-2 text-sm text-stone-400">
                    {PREMIUM_PRICES.yearly.period}
                  </span>
                </p>
                <p className="text-sm text-stone-400">
                  ou {PREMIUM_PRICES.monthly.amount} {PREMIUM_PRICES.monthly.period}, sans
                  engagement
                </p>
              </div>
              <p className="mt-6 text-sm text-stone-300">Tout le compte gratuit, plus :</p>
              <ul className="mt-4 flex-1 space-y-4">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature.title} className="flex gap-3">
                    <CheckCircle
                      className="text-accent-400 mt-0.5 h-4 w-4 shrink-0"
                      weight="fill"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-medium text-stone-50">{feature.title}</p>
                      <p className="text-sm text-stone-400">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="hover:bg-accent-100 mt-8 inline-flex w-full items-center justify-center rounded-[var(--radius-sm)] bg-stone-50 px-6 py-3 text-sm font-medium tracking-tight text-stone-900 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0"
              >
                Essayer gratuitement {TRIAL_DAYS} jours
              </Link>
              <p className="mt-3 text-center text-xs text-stone-400">
                Aucun prélèvement pendant l&apos;essai, résiliable en un clic.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Questions fréquentes sur l'offre, dépliables. */
export function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <h2 className="font-serif text-3xl text-stone-900 sm:text-4xl">Questions fréquentes</h2>
      <div className="mt-10 divide-y divide-stone-200 border-y border-stone-200">
        {FAQ.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900">
              {item.question}
              <span
                className="text-xl leading-none text-stone-400 transition-transform duration-200 group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
