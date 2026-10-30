import { parseSeriesFromTitle } from "@/lib/series";

/**
 * Repérage des sagas, sans réseau ni base : utilisé côté serveur pour les suggestions de la
 * page Sagas, et côté client à l'ajout d'un livre. Ce ne sont que des propositions, que
 * l'utilisateur confirme ou ignore : rien n'est rangé dans une saga sans son accord.
 */

export interface SeriesHint {
  seriesName: string;
  seriesIndex: number | null;
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

function romanToNumber(value: string): number | null {
  let total = 0;
  const chars = value.toUpperCase().split("");
  for (let i = 0; i < chars.length; i++) {
    const current = ROMAN[chars[i]];
    const next = ROMAN[chars[i + 1]] ?? 0;
    if (!current) return null;
    total += current < next ? -current : current;
  }
  return total > 0 && total < 200 ? total : null;
}

/**
 * « Nom, tome 2 », « Nom - Tome II : sous-titre », « Nom T2 », « Nom, vol. 3 »,
 * « Nom, livre 1 », « Nom, Book 2 », « Nom #2 ». Le nom est ce qui précède le marqueur.
 */
const VOLUME_PATTERN =
  /^(.+?)[\s,.:;–—-]*(?:\b(?:tome|t\.?|vol(?:ume)?\.?|livre|book|partie)\s*|#\s*)(\d{1,3}|[ivxlc]{1,6})\b/i;

function parseVolume(text: string): SeriesHint | null {
  const match = text.trim().match(VOLUME_PATTERN);
  if (!match) return null;
  const name = match[1].trim().replace(/[\s,.:;–—(-]+$/, "");
  const raw = match[2];
  const index = /^\d+$/.test(raw) ? Number(raw) : romanToNumber(raw);
  // « La Dernière Partie » ou un nom vide ne désignent pas une saga.
  if (name.length < 2 || index === null) return null;
  return { seriesName: name, seriesIndex: index };
}

/**
 * Saga indiquée par le titre ou le sous-titre d'un livre : format Goodreads
 * (« Dune (Dune, #1) »), puis marqueur de tome dans le sous-titre (« Le cycle de Dune,
 * tome 2 »), puis dans le titre (« Dune - Tome 1 »). `null` sans indice clair.
 */
export function seriesFromTitle(title: string, subtitle?: string | null): SeriesHint | null {
  const goodreads = parseSeriesFromTitle(title);
  if (goodreads) return { seriesName: goodreads.seriesName, seriesIndex: goodreads.seriesIndex };
  return (subtitle ? parseVolume(subtitle) : null) ?? parseVolume(title);
}

/** Forme comparable d'un texte : sans accents, casse ni ponctuation. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  (
    "le la les un une des du de d l et ou a au aux en dans sur sous pour par avec sans qui que " +
    "quoi dont ne pas plus son sa ses leur leurs ce cet cette ces mon ma mes il elle ils elles " +
    "the of and an to in on for with from tome livre volume partie cycle saga roman histoire " +
    "nouvelle edition integrale"
  ).split(" "),
);

/** Mots porteurs d'un titre : assez longs et hors mots outils. */
function significantWords(title: string): string[] {
  return [
    ...new Set(
      normalizeText(title)
        .split(" ")
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    ),
  ];
}

/** Le mot tel qu'il est écrit dans le titre (accents et majuscule compris). */
function originalWord(title: string, word: string): string {
  const found = title.split(/[^\p{L}\p{N}]+/u).find((token) => normalizeText(token) === word);
  const value = found ?? word;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  seriesName: string | null;
  seriesIndex: number | null;
  publishedDate: string | null;
}

export interface SeriesSuggestion {
  /** Identifiant stable, pour qu'une suggestion ignorée ne revienne pas. */
  key: string;
  name: string;
  /** La saga existe déjà : la suggestion propose d'y ajouter des livres. */
  existing: boolean;
  /** Comment elle a été repérée, pour l'expliquer à l'utilisateur. */
  reason: "title" | "author";
  books: { id: string; seriesIndex: number | null }[];
}

const yearOf = (date: string | null) => Number.parseInt(date ?? "", 10) || Infinity;

/**
 * Sagas probables dans une bibliothèque, parmi les livres qui n'en ont pas encore :
 * 1. le titre annonce un tome (« Dune, tome 2 ») ;
 * 2. un livre du même auteur partage un mot porteur avec une saga existante (« Les Enfants
 *    de Dune » à côté de la saga « Dune ») ;
 * 3. plusieurs livres du même auteur partagent un mot porteur (« Fondation », « Fondation et
 *    Empire », « Seconde Fondation ») : numérotés dans l'ordre de parution, à vérifier.
 */
export function suggestSeries(books: LibraryBook[]): SeriesSuggestion[] {
  const existingNames = new Map<string, string>();
  const existingAuthors = new Map<string, Set<string>>();
  for (const book of books) {
    if (!book.seriesName) continue;
    const key = normalizeText(book.seriesName);
    if (!existingNames.has(key)) existingNames.set(key, book.seriesName.trim());
    existingAuthors.set(
      key,
      (existingAuthors.get(key) ?? new Set()).add(normalizeText(book.author)),
    );
  }

  const free = books.filter((book) => !book.seriesName);
  const taken = new Set<string>();
  const groups = new Map<string, Omit<SeriesSuggestion, "key">>();

  const add = (
    name: string,
    reason: SeriesSuggestion["reason"],
    book: LibraryBook,
    index: number | null,
  ) => {
    const key = normalizeText(name);
    const group = groups.get(key) ?? {
      name: existingNames.get(key) ?? name,
      existing: existingNames.has(key),
      reason,
      books: [],
    };
    group.books.push({ id: book.id, seriesIndex: index });
    groups.set(key, group);
    taken.add(book.id);
  };

  // 1. Tome annoncé dans le titre.
  for (const book of free) {
    const hint = seriesFromTitle(book.title);
    if (hint) add(hint.seriesName, "title", book, hint.seriesIndex);
  }

  // Numéros de tome déjà pris dans chaque saga existante, pour proposer le premier manquant.
  const usedIndexes = new Map<string, Set<number>>();
  for (const book of books) {
    if (!book.seriesName || book.seriesIndex === null) continue;
    const key = normalizeText(book.seriesName);
    usedIndexes.set(key, (usedIndexes.get(key) ?? new Set()).add(book.seriesIndex));
  }
  const firstMissingIndex = (key: string) => {
    const used = usedIndexes.get(key) ?? new Set<number>();
    let index = 1;
    while (used.has(index)) index += 1;
    used.add(index);
    usedIndexes.set(key, used);
    return index;
  };

  // 2. Même auteur et mot porteur en commun avec une saga existante : proposé au premier
  //    numéro de tome libre (« Le Messie de Dune » entre les tomes 1 et 3).
  for (const book of free) {
    if (taken.has(book.id)) continue;
    const words = significantWords(book.title);
    for (const [key, authors] of existingAuthors) {
      if (!authors.has(normalizeText(book.author))) continue;
      if (significantWords(existingNames.get(key)!).some((word) => words.includes(word))) {
        add(existingNames.get(key)!, "author", book, firstMissingIndex(key));
        break;
      }
    }
  }

  // 3. Livres du même auteur partageant un mot porteur, le groupe le plus large d'abord.
  const byAuthor = new Map<string, LibraryBook[]>();
  for (const book of free) {
    if (taken.has(book.id)) continue;
    const author = normalizeText(book.author);
    byAuthor.set(author, [...(byAuthor.get(author) ?? []), book]);
  }
  for (const authorBooks of byAuthor.values()) {
    if (authorBooks.length < 2) continue;
    const byWord = new Map<string, LibraryBook[]>();
    for (const book of authorBooks) {
      for (const word of significantWords(book.title)) {
        byWord.set(word, [...(byWord.get(word) ?? []), book]);
      }
    }
    const candidates = [...byWord.entries()]
      .filter(([, group]) => group.length >= 2)
      .sort(([, a], [, b]) => b.length - a.length);
    for (const [word, group] of candidates) {
      const available = group.filter((book) => !taken.has(book.id));
      if (available.length < 2) continue;
      const shortest = [...available].sort((a, b) => a.title.length - b.title.length)[0];
      const name = originalWord(shortest.title, word);
      available
        .sort((a, b) => yearOf(a.publishedDate) - yearOf(b.publishedDate))
        .forEach((book, position) => add(name, "author", book, position + 1));
    }
  }

  return [...groups.values()].map((group) => ({
    ...group,
    key: `${normalizeText(group.name)}:${group.books
      .map((book) => book.id)
      .sort()
      .join(",")}`,
  }));
}

export interface KnownSeriesSummary {
  name: string;
  nextIndex: number;
  total: number | null;
  authors: string[];
}

export interface NewBookSeries {
  seriesName: string;
  seriesIndex: number | null;
  seriesTotal: number | null;
  /** La saga existe déjà dans la bibliothèque. */
  existing: boolean;
}

/**
 * Saga proposée pour un livre qu'on ajoute : celle qu'annonce son titre ou son sous-titre,
 * rattachée à une saga existante quand elle lui correspond (même nom, ou même auteur et nom
 * proche : « Le cycle de Dune » rejoint « Dune ») ; à défaut, une saga existante du même
 * auteur dont le nom figure dans le titre (« Les Enfants de Dune »).
 */
export function seriesForNewBook(
  title: string,
  subtitle: string | null | undefined,
  author: string,
  known: KnownSeriesSummary[],
): NewBookSeries | null {
  const authorKey = normalizeText(author);
  const sameAuthor = known.filter((entry) =>
    entry.authors.some((name) => normalizeText(name) === authorKey),
  );
  const sharesWord = (a: string, b: string) => {
    const words = significantWords(b);
    return significantWords(a).some((word) => words.includes(word));
  };

  const hint = seriesFromTitle(title, subtitle);
  if (hint) {
    const match =
      known.find((entry) => normalizeText(entry.name) === normalizeText(hint.seriesName)) ??
      sameAuthor.find((entry) => sharesWord(entry.name, hint.seriesName));
    return match
      ? {
          seriesName: match.name,
          seriesIndex: hint.seriesIndex ?? match.nextIndex,
          seriesTotal: match.total,
          existing: true,
        }
      : { ...hint, seriesTotal: null, existing: false };
  }

  const match = sameAuthor.find((entry) => sharesWord(entry.name, title));
  return match
    ? {
        seriesName: match.name,
        seriesIndex: match.nextIndex,
        seriesTotal: match.total,
        existing: true,
      }
    : null;
}
