import type { CatalogEntry } from "@/lib/book-catalog";
import { env } from "@/lib/env";
import { toIsbn10, toIsbn13 } from "@/lib/isbn";

/**
 * Sources de livres en complément de Google Books, interrogées par `lib/book-search.ts` :
 *
 * - **Open Library** : catalogue ouvert, sans clé ni quota. Retrouve beaucoup de livres
 *   absents de Google, et des couvertures quand Google n'en a pas (cas fréquent des ISBN
 *   français scannés).
 * - **BnF** (catalogue général, API SRU) : la notice du dépôt légal. Pour un livre publié en
 *   France, c'est la source fiable du nombre de pages imprimées (« 1 vol. (113 p.) ») ; Google
 *   renvoie souvent celui d'une autre édition, ou 0.
 *
 * Chaque appel a un délai court : une source lente ne doit pas retarder les autres, et son
 * échec n'est jamais une erreur pour l'utilisateur — on fait avec ce qui a répondu.
 */

const TIMEOUT_MS = 5000;
const headers = { "User-Agent": `BookList/1.0 (${env.NEXT_PUBLIC_APP_URL})` };

/** Un nombre de pages plausible, ou `null` (Google renvoie 0 pour « inconnu »). */
export function validPageCount(value: number | null | undefined): number | null {
  return value && value > 0 && value < 20_000 ? Math.round(value) : null;
}

// --- Open Library ----------------------------------------------------------------------

interface OpenLibraryData {
  title?: string;
  subtitle?: string;
  authors?: { name?: string }[];
  number_of_pages?: number;
  publish_date?: string;
  cover?: { medium?: string; large?: string };
  subjects?: { name?: string }[];
}

/** Notice Open Library d'une édition précise, par ISBN. */
export async function openLibraryByIsbn(isbn: string): Promise<CatalogEntry | null> {
  const key = `ISBN:${isbn}`;
  const params = new URLSearchParams({ bibkeys: key, format: "json", jscmd: "data" });
  const response = await fetch(`https://openlibrary.org/api/books?${params}`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Open Library a répondu ${response.status}`);
  const data = ((await response.json()) as Record<string, OpenLibraryData>)[key];
  if (!data?.title) return null;

  const year = data.publish_date?.match(/\d{4}/)?.[0] ?? null;
  return {
    id: `ol:${isbn}`,
    isbn,
    title: data.title,
    subtitle: data.subtitle ?? null,
    authors: data.authors?.map((author) => author.name ?? "").filter(Boolean) ?? [],
    description: null,
    coverUrl: data.cover?.large ?? data.cover?.medium ?? null,
    pageCount: validPageCount(data.number_of_pages),
    publishedDate: year,
    genres: null,
  };
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  editions?: {
    docs?: {
      title?: string;
      isbn?: string[];
      cover_i?: number;
      number_of_pages?: number;
      publish_date?: string[];
    }[];
  };
}

/**
 * Recherche texte sur Open Library. `lang=fr` fait renvoyer pour chaque œuvre son édition
 * française quand elle existe : son titre, son ISBN et sa couverture plutôt que ceux de
 * l'original.
 */
export async function openLibrarySearch(query: string): Promise<CatalogEntry[]> {
  const params = new URLSearchParams({
    q: query,
    lang: "fr",
    limit: "10",
    fields: [
      "key,title,subtitle,author_name,first_publish_year,cover_i,number_of_pages_median",
      "editions,editions.title,editions.isbn,editions.cover_i,editions.number_of_pages",
      "editions.publish_date",
    ].join(","),
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Open Library a répondu ${response.status}`);
  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };

  return (data.docs ?? [])
    .filter((doc) => doc.key && doc.title && doc.author_name?.length)
    .map((doc) => {
      const edition = doc.editions?.docs?.[0];
      const isbn = edition?.isbn?.map(toIsbn13).find((value) => value !== null) ?? null;
      const coverId = edition?.cover_i ?? doc.cover_i;
      return {
        id: `ol:${doc.key!.replace("/works/", "")}`,
        isbn,
        title: edition?.title ?? doc.title!,
        subtitle: doc.subtitle ?? null,
        authors: doc.author_name!,
        description: null,
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
        // Le nombre de pages de l'édition, sinon la médiane de toutes les éditions.
        pageCount: validPageCount(edition?.number_of_pages ?? doc.number_of_pages_median),
        publishedDate:
          edition?.publish_date?.[0]?.match(/\d{4}/)?.[0] ??
          doc.first_publish_year?.toString() ??
          null,
        genres: null,
      };
    });
}

// --- BnF -------------------------------------------------------------------------------

/** Contenu des balises Dublin Core `dc:<name>` d'une notice. */
function dcValues(record: string, name: string): string[] {
  return [...record.matchAll(new RegExp(`<dc:${name}>([^<]*)</dc:${name}>`, "g"))].map((match) =>
    decodeXml(match[1]).trim(),
  );
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

/** « 1 vol. (113 p.) : ill. ; 18 cm », « 616 p. », « 1 volume 191 p » → le nombre de pages. */
export function pagesFromFormat(format: string): number | null {
  const match = format.match(/(\d+)\s*p\b/);
  return match ? validPageCount(Number(match[1])) : null;
}

/** « Saint-Exupéry, Antoine de (1900-1944). Auteur du texte » → « Antoine de Saint-Exupéry ». */
export function authorFromCreator(creator: string): string | null {
  if (!/auteur/i.test(creator)) return null;
  const name = creator
    .replace(/\s*\(.*$/, "")
    .replace(/\.\s*Auteur.*$/i, "")
    .trim();
  const [last, first] = name.split(/,\s*/);
  return first ? `${first} ${last}` : last || null;
}

/**
 * Notice BnF d'un ISBN. Les livres d'avant 2007 n'y sont indexés que sous leur ISBN-10 :
 * on interroge les deux formes.
 */
export async function bnfByIsbn(isbn: string): Promise<CatalogEntry | null> {
  const forms = [toIsbn13(isbn), toIsbn10(isbn)].filter((value): value is string => !!value);
  if (forms.length === 0) return null;
  const params = new URLSearchParams({
    version: "1.2",
    operation: "searchRetrieve",
    query: forms.map((value) => `bib.isbn adj "${value}"`).join(" or "),
    recordSchema: "dublincore",
    maximumRecords: "1",
  });
  const response = await fetch(`https://catalogue.bnf.fr/api/SRU?${params}`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`BnF a répondu ${response.status}`);
  const xml = await response.text();
  const record = xml.match(/<oai_dc:dc[\s\S]*?<\/oai_dc:dc>/)?.[0];
  if (!record) return null;

  // « Le petit prince / Antoine de Saint-Exupéry ; avec des aquarelles de l'auteur »
  const [fullTitle] = dcValues(record, "title");
  const title = fullTitle?.split(" / ")[0].trim();
  if (!title) return null;

  const authors = dcValues(record, "creator")
    .map(authorFromCreator)
    .filter((name): name is string => !!name);
  const format = dcValues(record, "format").find((value) => /\d+\s*p\b/.test(value));

  return {
    id: `bnf:${forms[0]}`,
    isbn: forms[0],
    title,
    subtitle: null,
    authors,
    description: null,
    coverUrl: null,
    pageCount: format ? pagesFromFormat(format) : null,
    publishedDate: dcValues(record, "date")[0]?.match(/\d{4}/)?.[0] ?? null,
    genres: null,
  };
}
