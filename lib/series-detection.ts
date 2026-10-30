import type { SeriesCatalogVolume } from "@/drizzle/schema";
import { parseSeriesFromTitle } from "@/lib/series";
import type { FetchedSeries } from "@/lib/wikidata";

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

/**
 * Nom de saga commun à plusieurs titres : la plus longue suite de mots du titre le plus
 * court, contenant `word`, qu'on retrouve telle quelle dans tous les autres (« Harry
 * Potter à l'école des sorciers » et « … et la Chambre des secrets » donnent « Harry
 * Potter », pas seulement « Harry »).
 */
function commonName(titles: string[], word: string): string {
  const [shortest, ...others] = [...titles].sort((a, b) => a.length - b.length);
  const tokens = shortest.split(/\s+/).filter(Boolean);
  const containsAll = (phrase: string) =>
    others.every((title) => ` ${normalizeText(title)} `.includes(` ${phrase} `));

  let best: string[] = [];
  for (let start = 0; start < tokens.length; start++) {
    for (let end = start + 1; end <= tokens.length; end++) {
      const run = tokens.slice(start, end);
      const phrase = normalizeText(run.join(" "));
      if (!phrase.split(" ").includes(word) || !containsAll(phrase)) continue;
      if (run.length > best.length) best = run;
    }
  }
  // Pas d'article ni de ponctuation en bord de nom (« la Chambre » → « Chambre »).
  while (best.length > 1 && STOPWORDS.has(normalizeText(best[0]))) best = best.slice(1);
  while (best.length > 1 && STOPWORDS.has(normalizeText(best[best.length - 1]))) {
    best = best.slice(0, -1);
  }
  const name = best.join(" ").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : originalWord(shortest, word);
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
      const name = commonName(
        available.map((book) => book.title),
        word,
      );
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

// --- Sagas Wikidata ------------------------------------------------------------------

/**
 * Deux titres désignent-ils le même livre ? Égaux, ou le plus court suivi seulement d'un
 * marqueur de tome (« Dune » et « Dune - Tome 1 »). Pas un simple préfixe : « Fondation »
 * et « Fondation foudroyée » sont deux livres.
 */
function sameBook(a: string, b: string): boolean {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return (
    long.startsWith(`${short} `) &&
    /^(tome|t|vol|volume|livre|book)\b/.test(long.slice(short.length + 1))
  );
}

/** Le tome de la saga correspondant à un titre, s'il y en a un. */
export function volumeForTitle(series: FetchedSeries, title: string): SeriesCatalogVolume | null {
  return series.volumes.find((volume) => sameBook(volume.title, title)) ?? null;
}

export interface SagaBook {
  title: string;
  seriesIndex: number | null;
}

/**
 * La saga Wikidata qui correspond le mieux aux tomes de l'utilisateur : celle qui en
 * contient le plus, et à égalité la plus courte (« Fondation » existe en trilogie et en
 * cycle de sept tomes : avec les trois premiers en bibliothèque, c'est la trilogie).
 */
export function chooseSeries(candidates: FetchedSeries[], books: SagaBook[]): FetchedSeries | null {
  let best: { series: FetchedSeries; score: number; size: number } | null = null;
  for (const series of candidates) {
    const score = books.filter((book) =>
      series.volumes.some((volume) => sameBook(volume.title, book.title)),
    ).length;
    const size = series.volumes.filter((volume) => volume.index !== null).length;
    if (score === 0 || size === 0) continue;
    if (!best || score > best.score || (score === best.score && size < best.size)) {
      best = { series, score, size };
    }
  }
  return best?.series ?? null;
}

/**
 * Tomes numérotés de la saga absents de la bibliothèque : ni le même numéro dans la saga de
 * l'utilisateur, ni le même titre ailleurs dans sa bibliothèque (un tome peut y être sans
 * avoir été rangé dans la saga). Les hors-séries ne sont pas proposés.
 */
export function missingVolumes(
  series: FetchedSeries,
  sagaBooks: SagaBook[],
  libraryTitles: string[],
): SeriesCatalogVolume[] {
  const ownedIndexes = new Set(sagaBooks.map((book) => book.seriesIndex).filter((i) => i !== null));
  return series.volumes.filter(
    (volume) =>
      volume.index !== null &&
      !ownedIndexes.has(volume.index) &&
      !libraryTitles.some((title) => sameBook(title, volume.title)),
  );
}
