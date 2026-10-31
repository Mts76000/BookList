/**
 * Offres BookList, partagées par le serveur et les composants clients : rien ici ne dépend
 * de la base ni de l'environnement serveur.
 *
 * Principe : le compte gratuit doit être agréable au quotidien (ajout, suivi, recherche,
 * bilan annuel complet) pour que l'habitude se prenne ; Premium lève les plafonds de
 * quantité (livres, citations) et apporte l'intelligence et le confort (tri de la pile,
 * sagas complétées, statistiques avancées, défis, jokers, images de citations). Rien de ce
 * qui a été saisi n'est jamais retiré : un plafond atteint bloque seulement l'ajout.
 * L'import d'une bibliothèque existante passe toujours en entier.
 */

/** Nombre de livres d'une bibliothèque gratuite. Au-delà, l'ajout demande Premium (l'import,
 *  lui, n'est pas limité). */
export const FREE_BOOK_LIMIT = 50;

/** Citations d'un compte gratuit. Au-delà, l'ajout demande Premium ; les citations déjà
 *  saisies restent consultables, cherchables et exportables. */
export const FREE_QUOTE_LIMIT = 30;

/** Durée de l'essai gratuit de Premium (géré par Stripe), une fois par compte. */
export const TRIAL_DAYS = 14;

/** Jours manqués couverts chaque mois sans rompre la série de lecture (Premium). */
export const PREMIUM_STREAK_JOKERS = 2;

export type BillingInterval = "monthly" | "yearly";

/**
 * Prix affichés (`value` en euros, pour les données structurées). Les montants réellement
 * facturés sont ceux des prix Stripe configurés.
 */
export const PREMIUM_PRICES: Record<
  BillingInterval,
  { amount: string; period: string; perMonth: string; note?: string; value: number }
> = {
  monthly: { amount: "2,99 €", period: "par mois", perMonth: "2,99 €", value: 2.99 },
  yearly: {
    amount: "24 €",
    value: 24,
    period: "par an",
    perMonth: "2 €",
    note: "Soit 2 € par mois, 4 mois offerts",
  },
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
    title: "Citations illimitées, en images",
    description: `Au-delà des ${FREE_QUOTE_LIMIT} citations du compte gratuit, et chacune partageable en image.`,
  },
  {
    title: "Jokers de série",
    description: `${PREMIUM_STREAK_JOKERS} jours de grâce par mois pour ne jamais casser votre série de lecture.`,
  },
] as const;

/** Vrai tant que la période payée court encore. */
export function isPremiumActive(premiumUntil: Date | string | null | undefined): boolean {
  return !!premiumUntil && new Date(premiumUntil).getTime() > Date.now();
}
