/**
 * Styles de l'image du bilan annuel, tous offerts : chaque bilan partagé fait connaître
 * BookList, il n'a pas à être réservé à Premium. Les couleurs reprennent la palette de l'application (voir app/globals.css).
 */
export const REVIEW_THEMES = {
  classique: {
    label: "Classique",
    background: "#f8f3ea",
    surface: "#ffffff",
    ink: "#241d15",
    muted: "#6b5d49",
    accent: "#ab4f27",
  },
  nuit: {
    label: "Nuit",
    background: "#1d1812",
    surface: "#2a231b",
    ink: "#f8f3ea",
    muted: "#b5a78f",
    accent: "#e08a5c",
  },
  foret: {
    label: "Forêt",
    background: "#2f4027",
    surface: "#3b5032",
    ink: "#f3efe4",
    muted: "#c3cdb4",
    accent: "#e6c27a",
  },
  terracotta: {
    label: "Terracotta",
    background: "#ab4f27",
    surface: "#b9613a",
    ink: "#fdf6ec",
    muted: "#f5d3bd",
    accent: "#241d15",
  },
  ardoise: {
    label: "Ardoise",
    background: "#e4e7ea",
    surface: "#f4f6f8",
    ink: "#1c2329",
    muted: "#5b6670",
    accent: "#2f5d8a",
  },
} as const;

export type ReviewThemeId = keyof typeof REVIEW_THEMES;

export function isReviewTheme(value: string | null | undefined): value is ReviewThemeId {
  return !!value && value in REVIEW_THEMES;
}
