/**
 * Hôtes des couvertures fournies par la recherche et l'enrichissement de la bibliothèque
 * (Google Books, Open Library, BnF, Hardcover). Elles passent
 * par l'optimiseur d'images de Next.js (voir `images.remotePatterns` dans next.config.ts) et
 * par le cache hors-ligne du service worker.
 *
 * Une couverture saisie à la main peut venir de n'importe quel site : l'ouvrir à l'optimiseur
 * en ferait un proxy d'images public, servi depuis notre domaine. Ces URL-là sont donc
 * chargées directement par le navigateur (voir components/book-cover.tsx).
 */
export const OPTIMIZED_COVER_HOSTNAMES = [
  "books.google.com",
  "books.googleusercontent.com",
  "covers.openlibrary.org",
  // Open Library redirige ses couvertures vers des serveurs Internet Archive dont le
  // sous-domaine change d'une image à l'autre (ia801601, ia601601...).
  "archive.org",
  "*.archive.org",
  "catalogue.bnf.fr",
  "assets.hardcover.app",
] as const;

export function isOptimizedCoverUrl(url: string): boolean {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    hostname = parsed.hostname;
  } catch {
    return false;
  }

  return OPTIMIZED_COVER_HOSTNAMES.some((pattern) =>
    pattern.startsWith("*.") ? hostname.endsWith(pattern.slice(1)) : hostname === pattern,
  );
}
