/**
 * Conversion des exports d'autres applications de lecture vers les colonnes de l'import
 * BookList (`createBookSchema`). L'import reste un seul et même chemin : on détecte le format
 * d'après l'en-tête, on traduit chaque ligne, puis la validation habituelle s'applique.
 *
 * Formats reconnus :
 * - Goodreads : « My Books » → « Import and export » → « Export Library ».
 * - StoryGraph : « Manage Account » → « Export StoryGraph Library ».
 */

import { parseSeriesFromTitle } from "@/lib/series";

export type ImportFormat = "booklist" | "goodreads" | "storygraph";

type Row = Record<string, string>;

export function detectImportFormat(headers: string[]): ImportFormat {
  const set = new Set(headers.map((header) => header.trim()));
  if (set.has("Book Id") && set.has("Exclusive Shelf")) return "goodreads";
  if (set.has("Read Status") && set.has("ISBN/UID")) return "storygraph";
  return "booklist";
}

/**
 * Goodreads entoure ses ISBN d'une formule de tableur (`="9782070368228"`) pour qu'Excel
 * ne les convertisse pas en nombre ; StoryGraph met un identifiant interne à la place quand
 * le livre n'a pas d'ISBN. On ne garde qu'un ISBN-10 ou ISBN-13 plausible.
 */
function cleanIsbn(value: string | undefined): string {
  const digits = (value ?? "").replace(/[^0-9X]/gi, "").toUpperCase();
  return /^(\d{13}|\d{9}[\dX])$/.test(digits) ? digits : "";
}

/** `2023/05/14` (format des deux exports) → `2023-05-14`. Toute autre valeur est ignorée. */
function cleanDate(value: string | undefined): string {
  const match = (value ?? "").trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Note sur 5 : 0 signifie « non noté » chez Goodreads, StoryGraph autorise les quarts. */
function cleanRating(value: string | undefined): string {
  const rating = Number.parseFloat(value ?? "");
  if (!Number.isFinite(rating) || rating <= 0) return "";
  // Arrondie à la demi-étoile : StoryGraph exporte des notes comme 4.25.
  return String(Math.min(Math.max(Math.round(rating * 2) / 2, 0.5), 5));
}

/**
 * Statut BookList d'après l'étagère d'origine. Une étagère personnalisée n'a pas
 * d'équivalent : on la classe d'après la présence d'une date de fin, pour ne pas compter
 * comme lu un livre qui ne l'a pas été.
 */
function toStatus(shelf: string | undefined, endDate: string): string {
  switch ((shelf ?? "").trim().toLowerCase()) {
    case "read":
      return "FINISHED";
    case "currently-reading":
      return "READING";
    case "to-read":
      return "TO_READ";
    default:
      return endDate ? "FINISHED" : "TO_READ";
  }
}

/** Format lu, d'après la reliure Goodreads ou le format StoryGraph. */
function toFormat(value: string | undefined): string {
  const format = (value ?? "").trim().toLowerCase();
  if (!format) return "";
  if (/audio|audible|cd/.test(format)) return "audio";
  if (/kindle|ebook|e-book|digital|nook|kobo/.test(format)) return "ebook";
  return "paper";
}

/** Longueur maximale d'un commentaire (voir `commentSchema`). */
export const MAX_COMMENT_LENGTH = 5000;

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Texte d'un avis ou d'une note. Goodreads exporte ses avis en HTML (`<br />`, `<i>`…) :
 * les retours à la ligne sont gardés, les autres balises retirées, les entités décodées.
 */
function cleanNote(value: string | undefined): string {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (entity, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X"))
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      return HTML_ENTITIES[code.toLowerCase()] ?? entity;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Découpe une note trop longue pour un seul commentaire en plusieurs, à un espace près de la
 * limite : un long avis est repris en entier plutôt que tronqué.
 */
export function splitComment(text: string, max = MAX_COMMENT_LENGTH): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const cut = rest.lastIndexOf(" ", max);
    const end = cut > max / 2 ? cut : max;
    parts.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/** Étagères Goodreads standard, déjà reprises dans le statut. */
const GOODREADS_STATUS_SHELVES = new Set(["read", "to-read", "currently-reading"]);

function fromGoodreads(row: Row): Row {
  const userEndDate = cleanDate(row["Date Read"]);
  // Goodreads range la saga dans le titre : « Dune (Dune, #1) ».
  const series = parseSeriesFromTitle(row["Title"] ?? "");
  return {
    title: series?.title ?? row["Title"] ?? "",
    seriesName: series?.seriesName ?? "",
    seriesIndex: series?.seriesIndex?.toString() ?? "",
    author: row["Author"] ?? "",
    isbn: cleanIsbn(row["ISBN13"]) || cleanIsbn(row["ISBN"]),
    pageCount: row["Number of Pages"] ?? "",
    publishedDate: row["Original Publication Year"] || row["Year Published"] || "",
    userRating: cleanRating(row["My Rating"]),
    userEndDate,
    status: toStatus(row["Exclusive Shelf"], userEndDate),
    format: toFormat(row["Binding"]),
    tags: (row["Bookshelves"] ?? "")
      .split(",")
      .map((shelf) => shelf.trim())
      .filter((shelf) => shelf && !GOODREADS_STATUS_SHELVES.has(shelf))
      .join(", "),
    review: cleanNote(row["My Review"]),
    privateNotes: cleanNote(row["Private Notes"]),
  };
}

function fromStoryGraph(row: Row): Row {
  // « Dates Read » contient la dernière lecture sous forme d'intervalle début-fin ; « Last
  // Date Read » n'en donne que la fin.
  const [start] = (row["Dates Read"] ?? "").split("-");
  const userEndDate = cleanDate(row["Last Date Read"]);
  const status = (row["Read Status"] ?? "").trim().toLowerCase();
  return {
    title: row["Title"] ?? "",
    author: row["Authors"] ?? "",
    isbn: cleanIsbn(row["ISBN/UID"]),
    userRating: cleanRating(row["Star Rating"]),
    userStartDate: cleanDate(start),
    userEndDate,
    status: status === "did-not-finish" ? "ABANDONED" : toStatus(status, userEndDate),
    format: toFormat(row["Format"]),
    tags: row["Tags"] ?? "",
    review: cleanNote(row["Review"]),
  };
}

/**
 * Avis et notes privées d'une ligne traduite, à enregistrer comme commentaires du livre :
 * ils ne font pas partie des colonnes du livre, que `createBookSchema` ignore donc.
 */
export function importedComments(row: Row): string[] {
  return [row.review, row.privateNotes].flatMap((note) => (note ? splitComment(note) : []));
}

/** Traduit une ligne du format détecté en colonnes BookList, sans rien valider. */
export function toBookListRow(format: ImportFormat, row: Row): Row {
  if (format === "goodreads") return fromGoodreads(row);
  if (format === "storygraph") return fromStoryGraph(row);
  return row;
}
