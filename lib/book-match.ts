import { sameIsbn } from "@/lib/isbn";
import { normalizeText } from "@/lib/series-detection";

/** Un livre de la bibliothèque, tel que le renvoie GET /api/books. */
export interface OwnedBook {
  id: string;
  isbn: string | null;
  title: string;
  author: string;
  coverUrl: string | null;
  pageCount: number | null;
}

/** Un résultat de recherche à comparer à la bibliothèque. */
export interface BookCandidate {
  title: string;
  subtitle?: string | null;
  authors: string[];
  isbn: string | null;
}

export interface OwnedMatch {
  book: OwnedBook;
  /** Même ISBN (sûr), ou même titre et même auteur (autre édition, ou ajouté par son nom). */
  by: "isbn" | "title";
}

const UNKNOWN_AUTHOR = "auteur inconnu";

function authorWords(names: string[]): Set<string> {
  return new Set(
    names
      .map(normalizeText)
      .filter((name) => name && name !== UNKNOWN_AUTHOR)
      .flatMap((name) => name.split(" "))
      .filter((word) => word.length > 2),
  );
}

/**
 * Le livre de la bibliothèque qui correspond à un résultat de recherche, s'il y en a un.
 *
 * L'ISBN seul ne suffit pas : un livre ajouté par son titre porte l'ISBN d'une édition
 * choisie dans la recherche (ou aucun), et le code-barres scanné ensuite est souvent celui
 * d'une autre. On compare donc aussi titre et auteur, sans casse ni accents. Le titre doit
 * être identique, sous-titre compris ou non : « Dune - Tome 1 » et « Dune - Tome 2 » restent
 * deux livres.
 */
export function findOwnedBook(candidate: BookCandidate, library: OwnedBook[]): OwnedMatch | null {
  if (candidate.isbn) {
    const byIsbn = library.find((entry) => sameIsbn(entry.isbn, candidate.isbn));
    if (byIsbn) return { book: byIsbn, by: "isbn" };
  }

  const titles = new Set(
    [candidate.title, candidate.subtitle ? `${candidate.title} ${candidate.subtitle}` : null]
      .filter((value): value is string => !!value)
      .map(normalizeText),
  );
  const authors = authorWords(candidate.authors);

  const byTitle = library.find((entry) => {
    if (!titles.has(normalizeText(entry.title))) return false;
    const owned = authorWords([entry.author]);
    // Auteur inconnu d'un côté : le titre seul tranche.
    if (owned.size === 0 || authors.size === 0) return true;
    return [...owned].some((word) => authors.has(word));
  });
  return byTitle ? { book: byTitle, by: "title" } : null;
}
