import { Check, Minus } from "@phosphor-icons/react/ssr";
import { PricingCards } from "@/components/pricing-cards";
import { FREE_BOOK_LIMIT, FREE_QUOTE_LIMIT, PREMIUM_STREAK_JOKERS, TRIAL_DAYS } from "@/lib/plans";

/**
 * Sections publiques de la page d'accueil : les deux formules avec leur tableau de
 * comparaison, et la foire aux questions. Les questions servent aussi aux données
 * structurées (FAQPage) de la page.
 */

/** `true` : compris ; `false` : non compris ; une chaîne : compris, avec cette limite. */
type Included = boolean | string;

const COMPARISON: {
  group: string;
  rows: { label: string; free: Included; premium: Included }[];
}[] = [
  {
    group: "Votre bibliothèque",
    rows: [
      { label: "Livres", free: `${FREE_BOOK_LIMIT}`, premium: "Illimités" },
      { label: "Scan du code-barres et recherche", free: true, premium: true },
      { label: "Import de votre bibliothèque existante", free: "Complet", premium: "Complet" },
      { label: "Citations", free: `${FREE_QUOTE_LIMIT}`, premium: "Illimitées" },
      { label: "Recherche dans vos citations", free: true, premium: true },
      { label: "Citations en images à partager", free: false, premium: true },
      { label: "Export de vos données", free: true, premium: true },
    ],
  },
  {
    group: "Votre lecture",
    rows: [
      { label: "Objectif annuel, série et rappels", free: true, premium: true },
      { label: "Bilan annuel à partager", free: true, premium: true },
      { label: "Jokers de série", free: false, premium: `${PREMIUM_STREAK_JOKERS} par mois` },
      { label: "Défis personnels", free: false, premium: true },
    ],
  },
  {
    group: "Ce que BookList fait pour vous",
    rows: [
      { label: "Statistiques", free: "Essentielles", premium: "Détaillées" },
      { label: "Sagas", free: "Suivi", premium: "Complétées" },
      { label: "Pile à lire triée selon vos goûts", free: false, premium: true },
    ],
  },
];

function Cell({ value, premium = false }: { value: Included; premium?: boolean }) {
  if (value === true)
    return (
      <Check
        className={`mx-auto h-4 w-4 ${premium ? "text-accent-600" : "text-moss-500"}`}
        weight="bold"
        aria-label="Compris"
      />
    );
  if (value === false)
    return <Minus className="mx-auto h-4 w-4 text-stone-300" aria-label="Non compris" />;
  return (
    <span
      className={`text-xs sm:text-sm ${premium ? "font-medium text-stone-900" : "text-stone-600"}`}
    >
      {value}
    </span>
  );
}

export const FAQ = [
  {
    question: "Puis-je essayer Premium avant de payer ?",
    answer: `Oui : ${TRIAL_DAYS} jours d'essai gratuit sur les deux formules. Rien n'est prélevé pendant l'essai, et une résiliation avant la fin ne coûte rien : votre compte repasse simplement en gratuit.`,
  },
  {
    question: `Que se passe-t-il quand j'atteins ${FREE_BOOK_LIMIT} livres ?`,
    answer:
      "Rien ne disparaît : vos livres restent consultables, modifiables et exportables. Seul l'ajout de nouveaux livres un par un demande Premium ; l'import de votre bibliothèque existante passe toujours en entier.",
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

/** Les deux formules, puis le détail de ce que chacune comprend. */
export function PricingSection() {
  return (
    <section id="tarifs" className="bg-card scroll-mt-20 border-y border-stone-200/70">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="text-accent-700 text-sm font-medium">Tarifs</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl text-balance text-stone-900 sm:text-4xl">
          Gratuit pour commencer, Premium pour aller plus loin.
        </h2>
        <p className="mt-3 max-w-xl text-stone-500">
          Le compte gratuit suffit pour suivre vos lectures. Premium s&apos;adresse à ceux qui
          lisent beaucoup.
        </p>

        <PricingCards />

        <div className="mt-12">
          <h3 className="font-serif text-xl text-stone-900">Ce que comprend chaque formule</h3>
          <table className="mt-4 w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-medium tracking-wide text-stone-500 uppercase">
                <th scope="col" className="w-[52%] py-3 font-medium sm:w-[60%]">
                  <span className="sr-only">Fonctionnalité</span>
                </th>
                <th scope="col" className="py-3 text-center font-medium">
                  Gratuit
                </th>
                <th scope="col" className="text-accent-700 py-3 text-center font-medium">
                  Premium
                </th>
              </tr>
            </thead>
            {COMPARISON.map((section) => (
              <tbody key={section.group}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={3}
                    className="pt-6 pb-2 text-sm font-medium text-stone-900"
                  >
                    {section.group}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label} className="border-t border-stone-100">
                    <th scope="row" className="py-3 pr-3 text-sm font-normal text-stone-600">
                      {row.label}
                    </th>
                    <td className="py-3 text-center">
                      <Cell value={row.free} />
                    </td>
                    <td className="bg-accent-50/40 py-3 text-center">
                      <Cell value={row.premium} premium />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
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
