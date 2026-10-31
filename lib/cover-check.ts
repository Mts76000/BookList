import { env } from "@/lib/env";

/**
 * Vérification côté serveur qu'une URL de couverture mène bien à une couverture.
 *
 * Aucune source ne renvoie proprement une erreur quand elle n'a pas l'image : Google sert
 * une vignette « image not available », Open Library un pixel, la BnF une page d'erreur en
 * HTTP 500. Une URL enregistrée sans vérification finissait en couverture générée dans la
 * bibliothèque. On télécharge donc l'image une fois, à la recherche, et on n'enregistre que
 * celles qui ont l'allure d'une couverture : une vraie image, assez grande, en portrait.
 */

const TIMEOUT_MS = 5000;
const MAX_BYTES = 5_000_000;
const headers = { "User-Agent": `BookList/1.0 (${env.NEXT_PUBLIC_APP_URL})` };

/**
 * Hôtes des sources de livres, les seuls que le serveur télécharge pour vérification. Une
 * couverture saisie à la main ailleurs n'est jamais téléchargée (le serveur ne doit pas
 * aller chercher n'importe quelle URL fournie par un utilisateur) ni jugée : verdict
 * `unknown`, elle est gardée telle quelle.
 */
const COVER_HOSTS = [
  "books.google.com",
  "books.googleusercontent.com",
  "covers.openlibrary.org",
  "archive.org",
  "catalogue.bnf.fr",
  "assets.hardcover.app",
];

export function isAllowedCoverHost(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      COVER_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

/**
 * Dimensions des vignettes « image not available » de Google Books, aux différents niveaux
 * de zoom (voir aussi `GOOGLE_PLACEHOLDER_RATIO` dans components/book-cover.tsx).
 */
const GOOGLE_PLACEHOLDERS = new Set(["300x391", "575x750", "800x1043"]);

/** Largeur et hauteur d'une image JPEG, PNG, GIF ou WebP, lues dans son en-tête. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));

  if (bytes.length >= 24 && ascii(1, 3) === "PNG") {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 10 && ascii(0, 3) === "GIF") {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4);
    if (chunk === "VP8 ") {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width, height };
    }
    return null;
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // JPEG : on parcourt les segments jusqu'au premier SOFn, qui porte les dimensions.
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const isFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      }
      offset += 2 + view.getUint16(offset + 2);
    }
  }
  return null;
}

/** Une image de ces dimensions est-elle une couverture plausible ? */
export function looksLikeCover(url: string, size: { width: number; height: number }): boolean {
  const { width, height } = size;
  // Pixel de remplacement, icône, ou bandeau tronqué : pas une couverture.
  if (width < 50 || height < 70) return false;
  // Une couverture est en portrait, d'un format proche du carré au très allongé.
  const ratio = height / width;
  if (ratio < 1 || ratio > 2.2) return false;
  if (url.includes("books.google") && GOOGLE_PLACEHOLDERS.has(`${width}x${height}`)) return false;
  return true;
}

/**
 * Verdict sur une URL de couverture :
 * - `valid` : l'image existe et ressemble à une couverture ;
 * - `invalid` : la source a répondu, et ce n'est pas une couverture (404, image de
 *   remplacement, page HTML) ;
 * - `unknown` : la source n'a pas répondu (délai, panne). On ne conclut rien — une
 *   couverture déjà enregistrée n'est jamais retirée sur une panne passagère.
 */
export type CoverCheck = "valid" | "invalid" | "unknown";

export async function checkCover(url: string): Promise<CoverCheck> {
  if (!isAllowedCoverHost(url)) return "unknown";
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.status === 404 || response.status === 410) return "invalid";
    // La BnF répond 500 pour une notice sans couverture : seule la page d'erreur HTML
    // le distingue d'une vraie panne.
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      return url.includes("catalogue.bnf.fr") && type.includes("text/html") ? "invalid" : "unknown";
    }
    if (!type.startsWith("image/")) return "invalid";
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return "invalid";
    const size = imageSize(bytes);
    return size && looksLikeCover(url, size) ? "valid" : "invalid";
  } catch {
    return "unknown";
  }
}

/**
 * Première couverture valide d'une liste ordonnée par préférence. Toutes sont vérifiées en
 * parallèle : la plus lente ne coûte que son propre délai.
 */
export async function firstValidCover(
  candidates: (string | null | undefined)[],
): Promise<string | null> {
  const urls = [...new Set(candidates.filter((url): url is string => !!url))];
  const checks = await Promise.all(urls.map(checkCover));
  return urls.find((_, index) => checks[index] === "valid") ?? null;
}
