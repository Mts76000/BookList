/**
 * Le logo BookList : une étagère, deux tranches de livres debout et une troisième penchée,
 * sur une tuile terracotta. Source unique du dessin : le composant `<Logo />`, les icônes
 * (favicon, PWA) et les images générées (partage, Open Graph) partent de ces formes.
 */
export const LOGO_COLORS = {
  tile: "#a73e21",
  paper: "#f8f3ea",
  accent: "#dc9569",
} as const;

/** Formes du dessin dans une grille de 48 × 48, sans la tuile de fond. */
export const LOGO_SHAPES = {
  /** Livres debout : x, y, hauteur (largeur commune). */
  standing: [
    { x: 10, y: 15, height: 22 },
    { x: 19.5, y: 10.5, height: 26.5 },
  ],
  /** Livre penché, appuyé contre les autres. */
  leaning: { x: 29.5, y: 13, height: 24.5, transform: "rotate(14 37 37.5)" },
  width: 7.5,
  /** Filets des tranches. */
  bands: "M10 20h7.5M19.5 15.5h7.5M10 31h7.5M19.5 31h7.5",
  shelf: { x: 7, y: 37, width: 34, height: 2.6 },
} as const;

/**
 * Le logo en SVG autonome, pour les rendus qui ne passent pas par React DOM (Satori ne lit
 * une image que sous forme d'URL). `tile: false` ne garde que le dessin, à poser sur un fond
 * terracotta (icônes de l'application).
 */
export function logoMarkSvg({ tile = true }: { tile?: boolean } = {}): string {
  const { tile: tileColor, paper, accent } = LOGO_COLORS;
  const { standing, leaning, width, bands, shelf } = LOGO_SHAPES;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">`,
    tile ? `<rect width="48" height="48" rx="12" fill="${tileColor}"/>` : "",
    ...standing.map(
      (book) =>
        `<rect x="${book.x}" y="${book.y}" width="${width}" height="${book.height}" rx="1.6" fill="${paper}"/>`,
    ),
    `<rect x="${leaning.x}" y="${leaning.y}" width="${width}" height="${leaning.height}" rx="1.6" fill="${accent}" transform="${leaning.transform}"/>`,
    `<path d="${bands}" stroke="${tileColor}" stroke-width="1.3" stroke-opacity=".5"/>`,
    `<rect x="${shelf.x}" y="${shelf.y}" width="${shelf.width}" height="${shelf.height}" rx="1.3" fill="${paper}"/>`,
    `</svg>`,
  ].join("");
}

export function logoMarkDataUri(options?: { tile?: boolean }): string {
  return `data:image/svg+xml;base64,${Buffer.from(logoMarkSvg(options)).toString("base64")}`;
}
