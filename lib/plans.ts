/**
 * Offres BookList, partagées par le serveur et les composants clients : rien ici ne dépend
 * de la base ni de l'environnement serveur.
 *
 * Principe : le compte gratuit voit et garde tout ce qu'il saisit (livres, sagas, citations,
 * statistiques de base), et Premium apporte l'intelligence et le confort (tri de la pile,
 * sagas repérées et complétées, statistiques avancées, défis, jokers, recherche et images).
 * La seule limite de quantité porte sur les livres ajoutés un par un ; l'import d'une
 * bibliothèque existante passe toujours en entier.
 */

/** Nombre de livres d'une bibliothèque gratuite. Au-delà, l'ajout demande Premium (l'import,
 *  lui, n'est pas limité). */
export const FREE_BOOK_LIMIT = 50;

/** Durée de l'essai gratuit de Premium (géré par Stripe), une fois par compte. */
export const TRIAL_DAYS = 14;

/** Jours manqués couverts chaque mois sans rompre la série de lecture (Premium). */
export const PREMIUM_STREAK_JOKERS = 2;

export type BillingInterval = "monthly" | "yearly";

/** Prix affichés. Les montants réellement facturés sont ceux des prix Stripe configurés. */
export const PREMIUM_PRICES: Record<
  BillingInterval,
  { amount: string; period: string; note?: string }
> = {
  monthly: { amount: "2,99 €", period: "par mois" },
  yearly: { amount: "24 €", period: "par an", note: "Soit 2 € par mois, 4 mois offerts" },
};

/** Avantages Premium, dans l'ordre où ils sont présentés partout dans l'application. */
export const PREMIUM_FEATURES = [
  {
    title: "Bibliothèque illimitée",
    description: `Ajoutez autant de livres que vous voulez, au-delà des ${FREE_BOOK_LIMIT} du compte gratuit. L'import, lui, est toujours complet.`,
  },
  {
    title: "Sagas complétées",
    description:
      "BookList repère vos sagas, trouve les tomes qui vous manquent et les ajoute à votre pile en un clic.",
  },
  {
    title: "Quoi lire ensuite",
    description:
      "Votre pile à lire triée selon vos goûts : suites de sagas, auteurs et genres que vous notez le mieux.",
  },
  {
    title: "Statistiques avancées",
    description:
      "Durée moyenne d'un livre, longueur, temps pour finir votre pile, répartition des genres et des notes, vos auteurs.",
  },
  {
    title: "Défis personnels",
    description: "Créez vos propres défis : un genre, un auteur, des pavés, un nombre de pages.",
  },
  {
    title: "Recherche et images de citations",
    description: "Retrouvez n'importe quelle citation et partagez-la en image.",
  },
  {
    title: "Jokers de série",
    description: `${PREMIUM_STREAK_JOKERS} jours de grâce par mois pour ne jamais casser votre série de lecture.`,
  },
  {
    title: "Bilans personnalisés",
    description: "Quatre styles exclusifs pour l'image de votre bilan annuel à partager.",
  },
] as const;

/** Vrai tant que la période payée court encore. */
export function isPremiumActive(premiumUntil: Date | string | null | undefined): boolean {
  return !!premiumUntil && new Date(premiumUntil).getTime() > Date.now();
}
