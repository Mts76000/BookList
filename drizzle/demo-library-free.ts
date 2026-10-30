import {
  CURRENTLY_READING,
  READING_HISTORY,
  TO_READ,
  type DemoBook,
  type DemoStatus,
} from "./demo-library";

/**
 * Bibliothèque du second compte de démonstration (voir drizzle/seed-demo.ts) : celle de
 * Lucas, inscrit depuis le début de l'année, amateur de polars et de science-fiction, qui
 * n'a pas pris Premium. Il montre l'application telle que la voit un compte gratuit :
 * limite de livres en vue, statistiques et sagas en aperçu, citations plafonnées, pas de
 * défis ni de jokers.
 *
 * Les livres viennent presque tous de la bibliothèque de Camille, dont les couvertures sont
 * déjà en cache : seuls ses deux romans du domaine public, d'où viennent ses citations, en
 * demandent de nouvelles.
 */

const ALL_BOOKS = [...READING_HISTORY, ...CURRENTLY_READING, ...TO_READ];

/** Reprend un livre de Camille avec l'avis de Lucas, sans ses notes ni étagères à elle. */
function pick(title: string, status: DemoStatus, extra: Partial<DemoBook> = {}): DemoBook {
  const book = ALL_BOOKS.find((entry) => entry.title === title);
  if (!book) throw new Error(`Livre de démo introuvable : ${title}`);
  const { author, pageCount, genre, publishedDate, series, originalTitle } = book;
  return {
    title,
    author,
    pageCount,
    genre,
    publishedDate,
    series,
    originalTitle,
    status,
    ...extra,
  };
}

/** Lectures de l'année, dans l'ordre chronologique. */
export const FREE_READING_HISTORY: DemoBook[] = [
  pick("Le Crime de l'Orient-Express", "FINISHED", { rating: 4 }),
  pick("Fahrenheit 451", "FINISHED", { rating: 4 }),
  {
    title: "Le Mystère de la chambre jaune",
    author: "Gaston Leroux",
    pageCount: 320,
    genre: "Policier, Classique",
    publishedDate: "1907",
    status: "FINISHED",
    rating: 5,
    note: "Le meilleur huis clos que j'aie lu. Rouletabille, quel personnage.",
  },
  pick("Les hommes qui n'aimaient pas les femmes", "FINISHED", { rating: 5 }),
  pick("Mort sur le Nil", "FINISHED", { rating: 4 }),
  pick("1984", "FINISHED", { rating: 5, note: "Glaçant, et toujours d'actualité." }),
  pick("La Fille qui rêvait d'un bidon d'essence et d'une allumette", "FINISHED", {
    rating: 5,
  }),
  pick("Ulysse", "ABANDONED", { currentPage: 120 }),
  pick("Le Problème à trois corps", "FINISHED", { rating: 5 }),
  pick("Ils étaient dix", "FINISHED", { rating: 5 }),
  pick("Le Meilleur des mondes", "FINISHED", { rating: 3 }),
  {
    title: "Vingt mille lieues sous les mers",
    author: "Jules Verne",
    pageCount: 608,
    genre: "Aventure, Classique",
    publishedDate: "1870",
    status: "FINISHED",
    rating: 4,
  },
  pick("La Reine dans le palais des courants d'air", "FINISHED", { rating: 4 }),
  pick("Le Chien des Baskerville", "FINISHED", { rating: 3 }),
  pick("Neuromancien", "FINISHED", {
    rating: 2,
    note: "Trop confus pour moi, j'ai fini par principe.",
  }),
  pick("La Forêt sombre", "FINISHED", { rating: 5 }),
  pick("Le Meurtre de Roger Ackroyd", "FINISHED", { rating: 5 }),
  pick("Le Hobbit", "FINISHED", { rating: 4 }),
  pick("Station Eleven", "FINISHED", { rating: 4 }),
  pick("Klara et le Soleil", "FINISHED", { rating: 4 }),
  pick("Dune", "FINISHED", { rating: 4 }),
];

export const FREE_CURRENTLY_READING: (DemoBook & { startedDaysAgo: number })[] = [
  { ...pick("Fondation", "READING", { currentPage: 0 }), startedDaysAgo: 6 },
];

export const FREE_TO_READ: DemoBook[] = [
  pick("La Mort immortelle", "TO_READ"),
  pick("La Mystérieuse Affaire de Styles", "TO_READ"),
  pick("Le Messie de Dune", "TO_READ"),
  pick("La Main gauche de la nuit", "TO_READ"),
  pick("Sapiens", "TO_READ"),
  pick("Hypérion", "TO_READ"),
];

/** Citations d'œuvres françaises du domaine public, dans le plafond du compte gratuit. */
export const FREE_QUOTES: { title: string; content: string; page?: number }[] = [
  {
    title: "Le Mystère de la chambre jaune",
    content: "Le presbytère n'a rien perdu de son charme, ni le jardin de son éclat.",
  },
  { title: "Vingt mille lieues sous les mers", content: "Mobilis in mobili." },
];

/** Objectif de l'année, un peu en retard sur le rythme. */
export const FREE_GOAL = 30;
