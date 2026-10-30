import { normalizeText } from "@/lib/series-detection";

/**
 * Choix de l'édition d'un tome à ajouter, pour rester dans la collection des tomes déjà
 * possédés. Deux livres d'une même collection ont des ISBN très proches : même groupe de
 * langue (978-2 pour le français), même éditeur, et souvent la même tranche de numéros.
 * Plus le début de deux ISBN est commun, plus les éditions se ressemblent.
 */

/** Les seuls chiffres d'un ISBN-13, ou `null` pour un ISBN-10 ou absent. */
function isbn13(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/[^0-9]/g, "");
  return digits.length === 13 ? digits : null;
}

function commonPrefixLength(a: string, b: string): number {
  let length = 0;
  while (length < a.length && a[length] === b[length]) length += 1;
  return length;
}

/**
 * Ressemblance d'un ISBN avec ceux des tomes possédés : la longueur du plus long début
 * commun. Sans tome de référence, une édition française (978-2) est préférée.
 */
export function isbnAffinity(isbn: string | null | undefined, preferred: string[]): number {
  const candidate = isbn13(isbn);
  if (!candidate) return 0;
  const references = preferred.map(isbn13).filter((value): value is string => !!value);
  if (references.length === 0) return candidate.startsWith("9782") ? 4 : 0;
  return Math.max(...references.map((reference) => commonPrefixLength(candidate, reference)));
}

/** Parmi plusieurs ISBN d'une même œuvre, celui de l'édition la plus proche. */
export function bestIsbn(isbns: string[], preferred: string[]): string | null {
  let best: { isbn: string; score: number } | null = null;
  for (const isbn of isbns) {
    const normalized = isbn13(isbn);
    if (!normalized) continue;
    const score = isbnAffinity(normalized, preferred);
    if (!best || score > best.score) best = { isbn: normalized, score };
  }
  return best?.isbn ?? null;
}

/** Le résultat de recherche porte-t-il bien ce titre (sous-titre ou tomaison en plus) ? */
export function titleMatches(candidate: string, wanted: string): boolean {
  const a = normalizeText(candidate);
  const b = normalizeText(wanted);
  if (!a || !b) return false;
  // Le résultat peut ajouter une tomaison ou un sous-titre. L'inverse (résultat plus court)
  // n'est admis qu'à partir de trois mots : un coffret « Harry Potter » n'est pas un tome.
  return a === b || a.includes(b) || (a.split(" ").length >= 3 && b.includes(a));
}

/**
 * L'édition à retenir parmi des résultats de recherche : le bon titre d'abord, puis l'ISBN
 * le plus proche de la collection, puis la présence d'une couverture.
 */
export function pickEdition<
  T extends { title: string; isbn: string | null; coverUrl: string | null },
>(candidates: T[], wantedTitle: string, preferred: string[]): T | null {
  let best: { entry: T; score: number } | null = null;
  for (const entry of candidates) {
    if (!titleMatches(entry.title, wantedTitle)) continue;
    const score =
      isbnAffinity(entry.isbn, preferred) * 10 +
      (entry.coverUrl ? 5 : 0) +
      (normalizeText(entry.title) === normalizeText(wantedTitle) ? 3 : 0);
    if (!best || score > best.score) best = { entry, score };
  }
  return best?.entry ?? null;
}
