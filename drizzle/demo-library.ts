/**
 * Bibliothèque du compte de démonstration (voir drizzle/seed-demo.ts) : celle de Camille,
 * lectrice de science-fiction, de fantasy, de classiques et de polars, sur trois ans.
 *
 * Pensée pour que chaque écran ait quelque chose de cohérent à montrer :
 * - les sagas sont lues dans l'ordre, et le tome suivant attend dans la pile à lire
 *   (Dune 4, Le Problème à trois corps 3, Hypérion 2) : « Quoi lire ensuite » les propose ;
 * - des auteurs fétiches (Christie, Camus, Hugo) très bien notés ont encore un livre à lire,
 *   et un auteur moins aimé (Zola) en a un aussi, qui n'est pas recommandé ;
 * - les notes suivent des goûts nets : SF et fantasy hautes, quelques déceptions ;
 * - deux pavés abandonnés, deux lectures en cours en parallèle.
 *
 * Les livres terminés sont dans l'ordre de lecture : le script en déduit les dates.
 */

export type DemoStatus = "FINISHED" | "ABANDONED" | "READING" | "TO_READ";

export interface DemoBook {
  title: string;
  author: string;
  pageCount: number;
  genre: string;
  publishedDate: string;
  status: DemoStatus;
  rating?: number;
  format?: "paper" | "ebook" | "audio";
  tags?: string[];
  series?: { name: string; index: number; total: number };
  /** Pour une lecture en cours ou abandonnée : page atteinte. */
  currentPage?: number;
  /** Note personnelle, écrite par la lectrice. */
  note?: string;
}

const dune = (index: number) => ({ name: "Dune", index, total: 6 });
const fondation = (index: number) => ({ name: "Fondation", index, total: 3 });
const passeMiroir = (index: number) => ({ name: "La Passe-miroir", index, total: 4 });
const troisCorps = (index: number) => ({ name: "Le Problème à trois corps", index, total: 3 });
const anneau = (index: number) => ({ name: "Le Seigneur des anneaux", index, total: 3 });
const millenium = (index: number) => ({ name: "Millénium", index, total: 3 });
const kingkiller = (index: number) => ({ name: "Chronique du tueur de roi", index, total: 3 });
const hyperion = (index: number) => ({ name: "Les Cantos d'Hypérion", index, total: 4 });

/** Lectures terminées et abandonnées, dans l'ordre chronologique. */
export const READING_HISTORY: DemoBook[] = [
  // --- 2024
  {
    title: "L'Étranger",
    author: "Albert Camus",
    pageCount: 186,
    genre: "Classique, Roman",
    publishedDate: "1942",
    status: "FINISHED",
    rating: 5,
    tags: ["Favoris"],
    note: "Relu après le lycée : je n'avais rien compris la première fois.",
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    pageCount: 896,
    genre: "Science-Fiction",
    publishedDate: "1965",
    status: "FINISHED",
    rating: 5,
    series: dune(1),
    tags: ["Favoris"],
    note: "L'écologie d'Arrakis est le vrai personnage principal.",
  },
  {
    title: "Le Crime de l'Orient-Express",
    author: "Agatha Christie",
    pageCount: 256,
    genre: "Policier",
    publishedDate: "1934",
    status: "FINISHED",
    rating: 5,
  },
  {
    title: "Fondation",
    author: "Isaac Asimov",
    pageCount: 416,
    genre: "Science-Fiction",
    publishedDate: "1951",
    status: "FINISHED",
    rating: 4,
    series: fondation(1),
  },
  {
    title: "Germinal",
    author: "Émile Zola",
    pageCount: 592,
    genre: "Classique",
    publishedDate: "1885",
    status: "FINISHED",
    rating: 3,
    note: "Puissant mais éprouvant. Les descriptions de la mine m'ont épuisée.",
  },
  {
    title: "Les Fiancés de l'hiver",
    author: "Christelle Dabos",
    pageCount: 528,
    genre: "Fantasy",
    publishedDate: "2013",
    status: "FINISHED",
    rating: 5,
    series: passeMiroir(1),
  },
  {
    title: "Le Messie de Dune",
    author: "Frank Herbert",
    pageCount: 336,
    genre: "Science-Fiction",
    publishedDate: "1969",
    status: "FINISHED",
    rating: 4,
    series: dune(2),
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    pageCount: 512,
    genre: "Essai",
    publishedDate: "2011",
    status: "FINISHED",
    rating: 4,
    format: "audio",
  },
  {
    title: "Fondation et Empire",
    author: "Isaac Asimov",
    pageCount: 320,
    genre: "Science-Fiction",
    publishedDate: "1952",
    status: "FINISHED",
    rating: 4,
    series: fondation(2),
  },
  {
    title: "Mort sur le Nil",
    author: "Agatha Christie",
    pageCount: 320,
    genre: "Policier",
    publishedDate: "1937",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "Les Disparus du Clairdelune",
    author: "Christelle Dabos",
    pageCount: 560,
    genre: "Fantasy",
    publishedDate: "2015",
    status: "FINISHED",
    rating: 5,
    series: passeMiroir(2),
  },
  {
    title: "Ulysse",
    author: "James Joyce",
    pageCount: 1024,
    genre: "Classique",
    publishedDate: "1922",
    status: "ABANDONED",
    currentPage: 140,
    note: "Je réessaierai un jour. Peut-être.",
  },
  {
    title: "Seconde Fondation",
    author: "Isaac Asimov",
    pageCount: 320,
    genre: "Science-Fiction",
    publishedDate: "1953",
    status: "FINISHED",
    rating: 5,
    series: fondation(3),
  },
  {
    title: "La Peste",
    author: "Albert Camus",
    pageCount: 352,
    genre: "Classique, Roman",
    publishedDate: "1947",
    status: "FINISHED",
    rating: 5,
    tags: ["Favoris", "Prêtés"],
  },
  {
    title: "Les hommes qui n'aimaient pas les femmes",
    author: "Stieg Larsson",
    pageCount: 704,
    genre: "Policier, Thriller",
    publishedDate: "2005",
    status: "FINISHED",
    rating: 4,
    series: millenium(1),
    format: "ebook",
  },
  {
    title: "Le Nom du vent",
    author: "Patrick Rothfuss",
    pageCount: 832,
    genre: "Fantasy",
    publishedDate: "2007",
    status: "FINISHED",
    rating: 5,
    series: kingkiller(1),
    tags: ["Favoris"],
    note: "Le meilleur livre de fantasy que j'aie lu. Kvothe en prison au début, quelle idée.",
  },
  {
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
    pageCount: 224,
    genre: "Science-Fiction, Classique",
    publishedDate: "1953",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "La Mémoire de Babel",
    author: "Christelle Dabos",
    pageCount: 576,
    genre: "Fantasy",
    publishedDate: "2017",
    status: "FINISHED",
    rating: 4,
    series: passeMiroir(3),
  },
  // --- 2025
  {
    title: "Les Misérables",
    author: "Victor Hugo",
    pageCount: 1664,
    genre: "Classique",
    publishedDate: "1862",
    status: "FINISHED",
    rating: 5,
    tags: ["Favoris"],
    note: "Trois mois de lecture, et je recommencerais demain.",
  },
  {
    title: "Le Problème à trois corps",
    author: "Liu Cixin",
    pageCount: 512,
    genre: "Science-Fiction",
    publishedDate: "2008",
    status: "FINISHED",
    rating: 5,
    series: troisCorps(1),
  },
  {
    title: "Le Meurtre de Roger Ackroyd",
    author: "Agatha Christie",
    pageCount: 320,
    genre: "Policier",
    publishedDate: "1926",
    status: "FINISHED",
    rating: 5,
    note: "Je n'ai RIEN vu venir.",
  },
  {
    title: "La Fille qui rêvait d'un bidon d'essence et d'une allumette",
    author: "Stieg Larsson",
    pageCount: 752,
    genre: "Policier, Thriller",
    publishedDate: "2006",
    status: "FINISHED",
    rating: 4,
    series: millenium(2),
    format: "ebook",
  },
  {
    title: "1984",
    author: "George Orwell",
    pageCount: 416,
    genre: "Science-Fiction, Classique",
    publishedDate: "1949",
    status: "FINISHED",
    rating: 5,
  },
  {
    title: "Les Enfants de Dune",
    author: "Frank Herbert",
    pageCount: 640,
    genre: "Science-Fiction",
    publishedDate: "1976",
    status: "FINISHED",
    rating: 4,
    series: dune(3),
  },
  {
    title: "Bel-Ami",
    author: "Guy de Maupassant",
    pageCount: 432,
    genre: "Classique",
    publishedDate: "1885",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "La Forêt sombre",
    author: "Liu Cixin",
    pageCount: 640,
    genre: "Science-Fiction",
    publishedDate: "2008",
    status: "FINISHED",
    rating: 5,
    series: troisCorps(2),
    tags: ["Favoris"],
  },
  {
    title: "Du côté de chez Swann",
    author: "Marcel Proust",
    pageCount: 528,
    genre: "Classique",
    publishedDate: "1913",
    status: "ABANDONED",
    currentPage: 96,
  },
  {
    title: "La Communauté de l'anneau",
    author: "J. R. R. Tolkien",
    pageCount: 544,
    genre: "Fantasy",
    publishedDate: "1954",
    status: "FINISHED",
    rating: 5,
    series: anneau(1),
  },
  {
    title: "Ils étaient dix",
    author: "Agatha Christie",
    pageCount: 224,
    genre: "Policier",
    publishedDate: "1939",
    status: "FINISHED",
    rating: 5,
  },
  {
    title: "Les Deux Tours",
    author: "J. R. R. Tolkien",
    pageCount: 480,
    genre: "Fantasy",
    publishedDate: "1954",
    status: "FINISHED",
    rating: 4,
    series: anneau(2),
  },
  {
    title: "Klara et le Soleil",
    author: "Kazuo Ishiguro",
    pageCount: 384,
    genre: "Roman, Science-Fiction",
    publishedDate: "2021",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "Le Retour du roi",
    author: "J. R. R. Tolkien",
    pageCount: 512,
    genre: "Fantasy",
    publishedDate: "1955",
    status: "FINISHED",
    rating: 5,
    series: anneau(3),
  },
  {
    title: "La Reine dans le palais des courants d'air",
    author: "Stieg Larsson",
    pageCount: 864,
    genre: "Policier, Thriller",
    publishedDate: "2007",
    status: "FINISHED",
    rating: 3,
    series: millenium(3),
    format: "ebook",
    note: "Trop de procédure judiciaire sur la fin.",
  },
  {
    title: "Le Meilleur des mondes",
    author: "Aldous Huxley",
    pageCount: 288,
    genre: "Science-Fiction, Classique",
    publishedDate: "1932",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "Homo Deus",
    author: "Yuval Noah Harari",
    pageCount: 464,
    genre: "Essai",
    publishedDate: "2015",
    status: "FINISHED",
    rating: 3,
    format: "audio",
  },
  // --- 2026
  {
    title: "Le Comte de Monte-Cristo",
    author: "Alexandre Dumas",
    pageCount: 1504,
    genre: "Classique, Aventure",
    publishedDate: "1844",
    status: "FINISHED",
    rating: 5,
    tags: ["Favoris"],
  },
  {
    title: "Hypérion",
    author: "Dan Simmons",
    pageCount: 608,
    genre: "Science-Fiction",
    publishedDate: "1989",
    status: "FINISHED",
    rating: 5,
    series: hyperion(1),
  },
  {
    title: "La Chute",
    author: "Albert Camus",
    pageCount: 160,
    genre: "Classique, Roman",
    publishedDate: "1956",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "L'Homme sans qualités",
    author: "Robert Musil",
    pageCount: 1120,
    genre: "Classique",
    publishedDate: "1930",
    status: "ABANDONED",
    currentPage: 210,
  },
  {
    title: "Notre-Dame de Paris",
    author: "Victor Hugo",
    pageCount: 640,
    genre: "Classique",
    publishedDate: "1831",
    status: "FINISHED",
    rating: 5,
  },
  {
    title: "Les Vestiges du jour",
    author: "Kazuo Ishiguro",
    pageCount: 336,
    genre: "Roman",
    publishedDate: "1989",
    status: "FINISHED",
    rating: 4,
    tags: ["Prêtés"],
  },
  {
    title: "Neuromancien",
    author: "William Gibson",
    pageCount: 320,
    genre: "Science-Fiction",
    publishedDate: "1984",
    status: "FINISHED",
    rating: 3,
  },
  {
    title: "Le Hobbit",
    author: "J. R. R. Tolkien",
    pageCount: 400,
    genre: "Fantasy",
    publishedDate: "1937",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "Thérèse Raquin",
    author: "Émile Zola",
    pageCount: 288,
    genre: "Classique",
    publishedDate: "1867",
    status: "FINISHED",
    rating: 3,
  },
  {
    title: "Le Chien des Baskerville",
    author: "Arthur Conan Doyle",
    pageCount: 256,
    genre: "Policier, Classique",
    publishedDate: "1902",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "Le Vieil Homme et la Mer",
    author: "Ernest Hemingway",
    pageCount: 128,
    genre: "Classique, Roman",
    publishedDate: "1952",
    status: "FINISHED",
    rating: 4,
  },
  {
    title: "Station Eleven",
    author: "Emily St. John Mandel",
    pageCount: 480,
    genre: "Science-Fiction, Roman",
    publishedDate: "2014",
    status: "FINISHED",
    rating: 5,
  },
];

/** Lectures en cours, commencées il y a quelques jours (le script fixe les dates). */
export const CURRENTLY_READING: (DemoBook & { startedDaysAgo: number })[] = [
  {
    title: "La Tempête des échos",
    author: "Christelle Dabos",
    pageCount: 576,
    genre: "Fantasy",
    publishedDate: "2019",
    status: "READING",
    series: passeMiroir(4),
    currentPage: 0,
    startedDaysAgo: 16,
  },
  {
    title: "La Peur du sage",
    author: "Patrick Rothfuss",
    pageCount: 1008,
    genre: "Fantasy",
    publishedDate: "2011",
    status: "READING",
    series: kingkiller(2),
    currentPage: 0,
    startedDaysAgo: 7,
  },
];

/** Pile à lire. Les suites de sagas et les auteurs aimés y sont mêlés à d'autres envies. */
export const TO_READ: DemoBook[] = [
  {
    title: "L'Empereur-Dieu de Dune",
    author: "Frank Herbert",
    pageCount: 576,
    genre: "Science-Fiction",
    publishedDate: "1981",
    status: "TO_READ",
    series: dune(4),
  },
  {
    title: "La Mort immortelle",
    author: "Liu Cixin",
    pageCount: 816,
    genre: "Science-Fiction",
    publishedDate: "2010",
    status: "TO_READ",
    series: troisCorps(3),
  },
  {
    title: "La Chute d'Hypérion",
    author: "Dan Simmons",
    pageCount: 640,
    genre: "Science-Fiction",
    publishedDate: "1990",
    status: "TO_READ",
    series: hyperion(2),
  },
  {
    title: "La Mystérieuse Affaire de Styles",
    author: "Agatha Christie",
    pageCount: 288,
    genre: "Policier",
    publishedDate: "1920",
    status: "TO_READ",
  },
  {
    title: "L'Homme qui rit",
    author: "Victor Hugo",
    pageCount: 896,
    genre: "Classique",
    publishedDate: "1869",
    status: "TO_READ",
  },
  {
    title: "Les Justes",
    author: "Albert Camus",
    pageCount: 160,
    genre: "Classique, Théâtre",
    publishedDate: "1949",
    status: "TO_READ",
  },
  {
    title: "L'Assommoir",
    author: "Émile Zola",
    pageCount: 576,
    genre: "Classique",
    publishedDate: "1877",
    status: "TO_READ",
  },
  {
    title: "Le Silmarillion",
    author: "J. R. R. Tolkien",
    pageCount: 480,
    genre: "Fantasy",
    publishedDate: "1977",
    status: "TO_READ",
  },
  {
    title: "Auprès de moi toujours",
    author: "Kazuo Ishiguro",
    pageCount: 352,
    genre: "Roman, Science-Fiction",
    publishedDate: "2005",
    status: "TO_READ",
  },
  {
    title: "La Main gauche de la nuit",
    author: "Ursula K. Le Guin",
    pageCount: 352,
    genre: "Science-Fiction",
    publishedDate: "1969",
    status: "TO_READ",
    tags: ["Offerts"],
  },
  {
    title: "Le Maître et Marguerite",
    author: "Mikhaïl Boulgakov",
    pageCount: 528,
    genre: "Classique",
    publishedDate: "1967",
    status: "TO_READ",
  },
  {
    title: "Les Trois Mousquetaires",
    author: "Alexandre Dumas",
    pageCount: 896,
    genre: "Classique, Aventure",
    publishedDate: "1844",
    status: "TO_READ",
  },
];

/**
 * Citations, toutes tirées d'œuvres françaises du domaine public (auteurs morts depuis plus
 * de 70 ans, texte original et non traduction), rattachées au livre par son titre.
 */
export const QUOTES: { title: string; content: string; page?: number }[] = [
  {
    title: "Le Comte de Monte-Cristo",
    content: "Toute la sagesse humaine sera dans ces deux mots : attendre et espérer !",
    page: 1498,
  },
  {
    title: "Du côté de chez Swann",
    content: "Longtemps, je me suis couché de bonne heure.",
    page: 1,
  },
  {
    title: "Les Misérables",
    content:
      "Il dort. Quoique le sort fût pour lui bien étrange, il vivait. Il mourut quand il n'eut plus son ange.",
    page: 1660,
  },
  { title: "Notre-Dame de Paris", content: "ANANKÈ.", page: 7 },
  {
    title: "Germinal",
    content:
      "Des hommes poussaient, une armée noire, vengeresse, qui germait lentement dans les sillons.",
    page: 591,
  },
];

/** Objectifs annuels. Celui de 2026 est légèrement en avance sur le rythme. */
export const GOALS: Record<number, number> = { 2024: 15, 2025: 18, 2026: 14 };

/** Coup de cœur choisi à la main (les autres années restent automatiques). */
export const YEAR_FAVORITES: Record<number, string> = { 2024: "Le Nom du vent" };

/** Défis personnels de l'année en cours. */
export const CHALLENGES = [
  { title: "Un classique par trimestre", kind: "genre", target: 4, filter: "Classique" },
  { title: "Trois pavés cette année", kind: "long_books", target: 3, filter: null },
  { title: "10 000 pages en 2026", kind: "pages", target: 10_000, filter: null },
] as const;
