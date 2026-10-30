/**
 * ISBN : un même livre peut porter un ISBN-10 (éditions antérieures à 2007, anciennes
 * fiches Google) ou son équivalent ISBN-13 (le code-barres scanné). On compare donc
 * toujours sous la forme ISBN-13.
 */

/** Chiffres (et X final d'un ISBN-10) seuls, sans tirets ni espaces. */
export function cleanIsbn(value: string | null | undefined): string {
  return (value ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

function isbn13CheckDigit(first12: string): string {
  const sum = [...first12].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

/** Forme ISBN-13 d'un ISBN-10 ou 13, ou `null` si la valeur n'en est pas un. */
export function toIsbn13(value: string | null | undefined): string | null {
  const isbn = cleanIsbn(value);
  if (/^97[89]\d{10}$/.test(isbn)) return isbn;
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const first12 = `978${isbn.slice(0, 9)}`;
    return first12 + isbn13CheckDigit(first12);
  }
  return null;
}

/** Forme ISBN-10 d'un ISBN-13 en 978 (les catalogues anciens n'indexent qu'elle). */
export function toIsbn10(value: string | null | undefined): string | null {
  const isbn = toIsbn13(value);
  if (!isbn?.startsWith("978")) return null;
  const first9 = isbn.slice(3, 12);
  const sum = [...first9].reduce((total, digit, i) => total + Number(digit) * (10 - i), 0);
  const check = (11 - (sum % 11)) % 11;
  return first9 + (check === 10 ? "X" : String(check));
}

/** Deux ISBN désignent-ils la même édition, qu'ils soient écrits en 10 ou en 13 ? */
export function sameIsbn(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = toIsbn13(a);
  return x !== null && x === toIsbn13(b);
}
