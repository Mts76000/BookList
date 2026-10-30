/**
 * Offres BookList, partagées par le serveur et les composants clients : rien ici ne dépend
 * de la base ni de l'environnement serveur.
 *
 * Le compte gratuit est limité en nombre de livres, pas en fonctionnalités de base : ajouter,
 * noter, scanner, fixer un objectif et partager son bilan restent gratuits. Consulter et
 * exporter ses livres l'est toujours, même au-delà de la limite.
 */

/** Nombre de livres d'une bibliothèque gratuite. Au-delà, l'ajout demande Premium. */
export const FREE_BOOK_LIMIT = 50;

/** Durée de l'essai gratuit de Premium (géré par Stripe), une fois par compte. */
export const TRIAL_DAYS = 14;

/** Citations enregistrables avec un compte gratuit. */
export const FREE_QUOTE_LIMIT = 5;

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
    description: `Ajoutez et importez autant de livres que vous voulez, au-delà des ${FREE_BOOK_LIMIT} du compte gratuit.`,
  },
  {
    title: "Quoi lire ensuite",
    description:
      "BookList choisit dans votre pile à lire les livres qui collent à vos goûts et aux sagas en cours.",
  },
  {
    title: "Statistiques avancées",
    description: "Lectures mois par mois, répartition des genres et des notes, rythme de lecture.",
  },
  {
    title: "Défis personnels",
    description: "Créez vos propres défis : un genre, un auteur, des pavés, un nombre de pages.",
  },
  {
    title: "Citations illimitées",
    description: `Au-delà de ${FREE_QUOTE_LIMIT} citations, avec recherche et images à partager.`,
  },
  {
    title: "Vue d'ensemble des sagas",
    description: "Toutes vos séries, tome par tome, et le prochain tome à lire.",
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
