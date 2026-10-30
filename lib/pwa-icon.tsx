import { ImageResponse } from "next/og";
import { LOGO_COLORS, logoMarkDataUri } from "@/lib/logo-mark";

/** Le logo sur sa tuile, pour les images générées (partage, Open Graph). */
export function getLogoMark(): string {
  return logoMarkDataUri();
}

/**
 * Générateur partagé de toutes les icônes de l'application (favicon, apple-icon, icônes du
 * manifest PWA) : l'étagère du logo sur un fond terracotta plein, que le système arrondit
 * lui-même. Le favicon garde les coins arrondis de la tuile, puisque l'onglet du navigateur
 * l'affiche tel quel. `padding` réserve la marge de sécurité des icônes maskable, que le
 * système d'exploitation rogne pour appliquer son propre masque.
 */
export function generateIconResponse(px: number, padding = 0, { rounded = false } = {}) {
  const glyph = px - padding * 2;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: LOGO_COLORS.tile,
        borderRadius: rounded ? px / 4 : 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu par satori, hors DOM */}
      <img src={logoMarkDataUri({ tile: false })} width={glyph} height={glyph} alt="" />
    </div>,
    { width: px, height: px },
  );
}
