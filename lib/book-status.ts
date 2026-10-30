/**
 * Statuts et formats de lecture, avec leurs libellés et couleurs : la seule définition,
 * partagée par la bibliothèque, la fiche, l'ajout et les filtres.
 */

export const BOOK_STATUSES = ["TO_READ", "READING", "FINISHED", "ABANDONED"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export function isBookStatus(value: string | null | undefined): value is BookStatus {
  return BOOK_STATUSES.includes(value as BookStatus);
}

/**
 * Tris de l'étagère. Le choix est mémorisé dans un cookie (`BOOKS_SORT_COOKIE`) : revenir
 * sur l'étagère par la navigation garde le dernier tri, sans flash ni second rendu.
 */
export const BOOK_SORTS = {
  date: "Lecture récente",
  oldest: "Lecture ancienne",
  added: "Ajoutés récemment",
  title: "Titre",
  rating: "Mieux notés",
  pages: "Plus longs",
} as const;
export type BookSort = keyof typeof BOOK_SORTS;
export const BOOKS_SORT_COOKIE = "books-sort";

export function isBookSort(value: string | null | undefined): value is BookSort {
  return !!value && Object.hasOwn(BOOK_SORTS, value);
}

/** Note affichée à la française, demi-étoile comprise : 4,5. */
export function formatRating(rating: number): string {
  return rating.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  FINISHED: "Terminé",
  ABANDONED: "Abandonné",
};

/** Pastille de couleur du statut. */
export const STATUS_DOT: Record<BookStatus, string> = {
  TO_READ: "bg-stone-400",
  READING: "bg-accent-500",
  FINISHED: "bg-moss-500",
  ABANDONED: "bg-stone-300",
};

/** Badge du statut (fond et texte). */
export const STATUS_BADGE: Record<BookStatus, string> = {
  TO_READ: "bg-stone-100 text-stone-600",
  READING: "bg-accent-50 text-accent-700",
  FINISHED: "bg-moss-100 text-moss-800",
  ABANDONED: "bg-stone-100 text-stone-500",
};

/** Bouton de statut sélectionné dans un formulaire. */
export const STATUS_ACTIVE: Record<BookStatus, string> = {
  TO_READ: "bg-stone-800 text-stone-50 shadow-md",
  READING: "bg-accent-600 text-stone-50 shadow-md",
  FINISHED: "bg-moss-600 text-stone-50 shadow-md",
  ABANDONED: "bg-stone-500 text-stone-50 shadow-md",
};

export const BOOK_FORMATS = ["paper", "ebook", "audio"] as const;
export type BookFormat = (typeof BOOK_FORMATS)[number];

export const FORMAT_LABELS: Record<BookFormat, string> = {
  paper: "Papier",
  ebook: "Numérique",
  audio: "Audio",
};

export function isBookFormat(value: string | null | undefined): value is BookFormat {
  return BOOK_FORMATS.includes(value as BookFormat);
}

/** Étagères saisies séparées par des virgules : nettoyées, sans doublon, sans casse. */
export function parseTags(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value) ? value : (value ?? "").split(",");
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of raw.map((entry) => entry.trim()).filter(Boolean)) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag.slice(0, 40));
  }
  return tags.slice(0, 20);
}
