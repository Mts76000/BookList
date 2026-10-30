import { config } from "dotenv";
config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "better-auth/db";
import * as schema from "./schema";
import {
  CHALLENGES,
  CURRENTLY_READING,
  GOALS,
  QUOTES,
  READING_HISTORY,
  TO_READ,
  YEAR_FAVORITES,
  type DemoBook,
} from "./demo-library";

/**
 * Compte de démonstration : une lectrice avec trois ans d'historique cohérent (voir
 * drizzle/demo-library.ts). Relançable : le compte est supprimé puis recréé à l'identique,
 * les dates étant recalculées pour finir aujourd'hui.
 *
 *   npm run db:seed:demo
 *
 * Même mot de passe que les comptes de drizzle/seed.ts. Premium est offert pour un an, pour
 * que toutes les fonctions soient visibles ; le retirer depuis l'administration montre la
 * version gratuite.
 */
const DEMO_EMAIL = "demo@booklist.fr";
const DEMO_PASSWORD = "test1234";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Générateur pseudo-aléatoire déterministe : le même historique à chaque exécution. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(2024);
const between = (min: number, max: number) => min + random() * (max - min);

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

// --- Couvertures et ISBN -------------------------------------------------------------

interface BookMetadata {
  coverUrl: string | null;
  isbn: string | null;
  description: string | null;
}

/** Quota Google Books épuisé pendant cette exécution : inutile d'insister. */
let googleExhausted = false;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (response.status === 429 && url.includes("googleapis.com")) googleExhausted = true;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Titre comparable : sans accents, casse ni ponctuation. */
function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Le résultat porte-t-il bien ce titre ? Une recherche sur « Le Nom du vent » renvoie aussi
 * le tome 2 de la saga : sans ce contrôle, un tome hériterait de la couverture d'un autre.
 */
function sameTitle(found: string | undefined, wanted: string): boolean {
  if (!found) return false;
  const a = normalizeTitle(found);
  const b = normalizeTitle(wanted);
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

type GoogleVolume = {
  title?: string;
  imageLinks?: { thumbnail?: string };
  industryIdentifiers?: { type: string; identifier: string }[];
  description?: string;
};

async function searchGoogle(
  query: string,
  title: string,
  french: boolean,
): Promise<BookMetadata | null> {
  if (googleExhausted) return null;
  const params = new URLSearchParams({ q: query, maxResults: "10", printType: "books" });
  if (french) params.set("langRestrict", "fr");
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const data = (await fetchJson(`https://www.googleapis.com/books/v1/volumes?${params}`)) as {
    items?: { volumeInfo?: GoogleVolume }[];
  };
  const volume = data.items?.find(
    (item) => item.volumeInfo?.imageLinks?.thumbnail && sameTitle(item.volumeInfo.title, title),
  )?.volumeInfo;
  if (!volume?.imageLinks?.thumbnail) return null;
  return {
    coverUrl: volume.imageLinks.thumbnail.replace(/^http:/, "https:"),
    isbn: volume.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier ?? null,
    description: volume.description ?? null,
  };
}

async function searchOpenLibrary(
  params: Record<string, string>,
  title: string,
): Promise<BookMetadata | null> {
  const query = new URLSearchParams({ ...params, limit: "10", fields: "cover_i,isbn,title" });
  const data = (await fetchJson(`https://openlibrary.org/search.json?${query}`)) as {
    docs?: { cover_i?: number; isbn?: string[]; title?: string }[];
  };
  const doc = data.docs?.find((entry) => entry.cover_i && sameTitle(entry.title, title));
  if (!doc?.cover_i) return null;
  return {
    coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
    isbn: doc.isbn?.find((isbn) => isbn.length === 13) ?? null,
    description: null,
  };
}

/**
 * Couverture, ISBN et résumé réels, en essayant des recherches de plus en plus larges :
 * édition française sur Google Books, toute édition, puis Open Library par titre et auteur
 * et en texte libre. Sans réseau, le livre est créé sans couverture.
 */
async function lookupMetadata({ title, author, originalTitle }: DemoBook): Promise<BookMetadata> {
  const attempts = [
    () => searchGoogle(`intitle:${title} inauthor:${author}`, title, true),
    () => searchGoogle(`${title} ${author}`, title, false),
    () => searchOpenLibrary({ title, author }, title),
    () => searchOpenLibrary({ q: `${title} ${author}` }, title),
  ];
  // Une édition étrangère prête sa couverture, pas son ISBN, qui désignerait un autre livre.
  if (originalTitle)
    attempts.push(async () => {
      const found = await searchOpenLibrary({ title: originalTitle, author }, originalTitle);
      return found && { ...found, isbn: null };
    });
  for (const attempt of attempts) {
    try {
      const found = await attempt();
      if (found) return found;
    } catch {
      // Quota dépassé ou réseau absent : recherche suivante.
    }
  }
  return { coverUrl: null, isbn: null, description: null };
}

/**
 * Cache des couvertures trouvées, versionné avec le script : une relance ne réinterroge
 * les API que pour les livres encore sans couverture, sans entamer le quota quotidien de
 * Google Books partagé avec l'application.
 */
const CACHE_PATH = join(dirname(fileURLToPath(import.meta.url)), "demo-covers.json");

function readCache(): Record<string, BookMetadata> {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Record<string, BookMetadata>;
  } catch {
    return {};
  }
}

/** Récupère les métadonnées manquantes par petits lots, pour ménager les API. */
async function lookupAll(books: DemoBook[]): Promise<Map<string, BookMetadata>> {
  const cache = readCache();
  const missing = books.filter((book) => !cache[book.title]?.coverUrl);
  for (let i = 0; i < missing.length; i += 4) {
    const batch = missing.slice(i, i + 4);
    const found = await Promise.all(batch.map(lookupMetadata));
    batch.forEach((b, index) => {
      if (found[index].coverUrl) cache[b.title] = found[index];
    });
    process.stdout.write(
      `\rCouvertures recherchées : ${Math.min(i + 4, missing.length)}/${missing.length}`,
    );
  }
  if (missing.length > 0) process.stdout.write("\n");

  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CACHE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  if (googleExhausted) {
    console.log("Quota Google Books atteint : relancez demain pour les couvertures restantes.");
  }
  return new Map(
    books.map((book) => [
      book.title,
      cache[book.title] ?? { coverUrl: null, isbn: null, description: null },
    ]),
  );
}

// --- Calendrier de lecture -----------------------------------------------------------

interface Reading {
  book: DemoBook;
  start: Date;
  end: Date;
  /** Pages lues par jour sur la période, qui alimentent `reading_activity`. */
  days: Map<string, number>;
}

/** Répartit `pages` sur les jours de la période, avec quelques jours sans lecture. */
function spreadPages(start: Date, end: Date, pages: number): Map<string, number> {
  const length = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const reading: Date[] = [];
  for (let i = 0; i < length; i++) {
    const day = addDays(start, i);
    // Le premier et le dernier jour sont toujours lus ; les autres, presque toujours.
    if (i === 0 || i === length - 1 || random() > 0.12) reading.push(day);
  }
  const weights = reading.map(() => between(0.6, 1.4));
  const total = weights.reduce((a, b) => a + b, 0);
  const days = new Map<string, number>();
  let assigned = 0;
  reading.forEach((day, index) => {
    const share =
      index === reading.length - 1
        ? pages - assigned
        : Math.max(Math.round((weights[index] / total) * pages), 1);
    assigned += share;
    days.set(dayKey(day), Math.max(share, 1));
  });
  return days;
}

/**
 * Place les lectures d'une année bout à bout entre deux dates, chacune d'une durée
 * proportionnelle à son nombre de pages (ou aux pages lues avant abandon), séparées de
 * quelques jours de pause.
 */
function scheduleYear(books: DemoBook[], from: Date, to: Date): Reading[] {
  const span = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  const weights = books.map((b) => (b.currentPage ?? b.pageCount) * between(0.75, 1.3));
  const gaps = books.map(() => between(1, 6));
  const total = weights.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  const scale = span / total;

  const readings: Reading[] = [];
  let cursor = from;
  books.forEach((book, index) => {
    const duration = Math.max(Math.round(weights[index] * scale), 1);
    const start = cursor;
    const end = addDays(start, duration - 1);
    readings.push({
      book,
      start,
      end,
      days: spreadPages(start, end, book.currentPage ?? book.pageCount),
    });
    cursor = addDays(end, Math.max(Math.round(gaps[index] * scale), 1));
  });
  return readings;
}

// --- Seed ---------------------------------------------------------------------------

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  const today = utcDay(new Date());
  const currentYear = today.getUTCFullYear();
  const firstYear = currentYear - 2;

  // Les blocs de demo-library.ts couvrent trois années, dans l'ordre.
  const yearStarts = [
    0,
    READING_HISTORY.findIndex((b) => b.title === "Les Misérables"),
    READING_HISTORY.findIndex((b) => b.title === "Le Comte de Monte-Cristo"),
  ];
  const lastHistoricalDay = addDays(today, -(CURRENTLY_READING[0].startedDaysAgo + 1));
  const readings = [0, 1, 2].flatMap((offset) => {
    const year = firstYear + offset;
    const books = READING_HISTORY.slice(yearStarts[offset], yearStarts[offset + 1]);
    const from = new Date(Date.UTC(year, 0, 4));
    const to = offset === 2 ? lastHistoricalDay : new Date(Date.UTC(year, 11, 28));
    return scheduleYear(books, from, to);
  });

  // Lectures en cours : chaque jour depuis leur début, jusqu'à aujourd'hui inclus, pour
  // une série en cours. La page atteinte est la somme des pages lues.
  const current = CURRENTLY_READING.map((book) => {
    const start = addDays(today, -book.startedDaysAgo);
    const days = new Map<string, number>();
    for (let i = 0; i <= book.startedDaysAgo; i++) {
      days.set(dayKey(addDays(start, i)), Math.round(between(14, 32)));
    }
    const currentPage = [...days.values()].reduce((a, b) => a + b, 0);
    return { book: { ...book, currentPage }, start, days };
  });

  console.log("Recherche des couvertures...");
  const metadata = await lookupAll([...READING_HISTORY, ...CURRENTLY_READING, ...TO_READ]);

  // Recrée le compte de zéro : la suppression de l'utilisateur emporte en cascade livres,
  // notes, citations, activité, objectifs, défis et sessions.
  await db.delete(schema.user).where(eq(schema.user.email, DEMO_EMAIL));

  const userId = randomUUID();
  const usedIsbns = new Set<string>();

  await db.transaction(async (tx) => {
    await tx.insert(schema.user).values({
      id: userId,
      name: "Camille",
      email: DEMO_EMAIL,
      emailVerified: true,
      role: "user",
      hasSeenOnboarding: true,
      premiumGrantedUntil: addDays(today, 365),
      createdAt: new Date(Date.UTC(firstYear, 0, 2)),
    });
    await tx.insert(schema.account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      userId,
      password: await hashPassword(DEMO_PASSWORD),
    });

    const bookIds = new Map<string, string>();
    const insertBook = async (
      book: DemoBook,
      dates: { start?: Date; end?: Date; currentPage?: number },
    ) => {
      const meta = metadata.get(book.title);
      // Deux éditions renvoyées avec le même ISBN violeraient l'unicité par bibliothèque.
      const isbn = meta?.isbn && !usedIsbns.has(meta.isbn) ? meta.isbn : null;
      if (isbn) usedIsbns.add(isbn);
      const id = randomUUID();
      bookIds.set(book.title, id);
      await tx.insert(schema.book).values({
        id,
        userId,
        title: book.title,
        author: book.author,
        isbn,
        description: meta?.description ?? null,
        coverUrl: meta?.coverUrl ?? null,
        pageCount: book.pageCount,
        genre: book.genre,
        publishedDate: book.publishedDate,
        userRating: book.rating ?? null,
        userStartDate: dates.start ?? null,
        userEndDate: dates.end ?? null,
        status: book.status,
        currentPage: dates.currentPage ?? null,
        format: book.format ?? "paper",
        tags: book.tags ?? null,
        seriesName: book.series?.name ?? null,
        seriesIndex: book.series?.index ?? null,
        seriesTotal: book.series?.total ?? null,
        createdAt: dates.start ?? addDays(today, -Math.round(between(5, 400))),
      });
      if (book.note) {
        await tx.insert(schema.comment).values({
          bookId: id,
          userId,
          content: book.note,
          createdAt: dates.end ?? dates.start ?? today,
        });
      }
    };

    for (const reading of readings) {
      await insertBook(reading.book, {
        start: reading.start,
        end: reading.end,
        currentPage: reading.book.status === "ABANDONED" ? reading.book.currentPage : undefined,
      });
    }
    for (const reading of current) {
      await insertBook(reading.book, {
        start: reading.start,
        currentPage: reading.book.currentPage,
      });
    }
    for (const book of TO_READ) await insertBook(book, {});

    // Activité quotidienne : la somme exacte des pages lues chaque jour, tous livres
    // confondus.
    const activity = new Map<string, number>();
    for (const { days } of [...readings, ...current]) {
      for (const [day, pages] of days) activity.set(day, (activity.get(day) ?? 0) + pages);
    }
    const activityRows = [...activity].map(([date, pagesRead]) => ({ userId, date, pagesRead }));
    for (let i = 0; i < activityRows.length; i += 500) {
      await tx.insert(schema.readingActivity).values(activityRows.slice(i, i + 500));
    }

    for (const [offset, target] of Object.values(GOALS).entries()) {
      await tx.insert(schema.readingGoal).values({ userId, year: firstYear + offset, target });
    }
    for (const [offset, title] of Object.values(YEAR_FAVORITES).entries()) {
      const bookId = bookIds.get(title);
      if (bookId) {
        await tx.insert(schema.yearFavorite).values({ userId, year: firstYear + offset, bookId });
      }
    }
    for (const entry of QUOTES) {
      const bookId = bookIds.get(entry.title);
      if (bookId) {
        await tx.insert(schema.quote).values({
          userId,
          bookId,
          content: entry.content,
          page: entry.page ?? null,
        });
      }
    }
    for (const challenge of CHALLENGES) {
      await tx.insert(schema.readingChallenge).values({
        userId,
        year: currentYear,
        title: challenge.title,
        kind: challenge.kind,
        target: challenge.target,
        filter: challenge.filter,
      });
    }
  });

  const finished = readings.filter((r) => r.book.status === "FINISHED").length;
  const withCover = [...metadata.values()].filter((m) => m.coverUrl).length;
  console.log(
    `Compte ${DEMO_EMAIL} créé : ${finished} livres lus, ${current.length} en cours, ` +
      `${TO_READ.length} à lire, ${withCover}/${metadata.size} couvertures trouvées.`,
  );
  console.log(`Connexion : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
