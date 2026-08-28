import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const BACKGROUND = "#f8f3ea";

// Satori ne résout ni URL ni chemin public : il lui faut les octets de l'image. Le fichier
// est lu une seule fois par processus, et seulement au build puisque toutes les routes qui
// appellent cette fonction sont statiques.
let markDataUri: string | undefined;

export function getLogoMark(): string {
  markDataUri ??= `data:image/png;base64,${readFileSync(
    join(process.cwd(), "public", "logo-mark.png"),
  ).toString("base64")}`;

  return markDataUri;
}

/**
 * Générateur partagé de toutes les icônes de l'application (favicon, apple-icon, icônes du
 * manifest PWA) : le livre ouvert du logo, centré sur le fond crème de la marque.
 * `padding` réserve la marge de sécurité des icônes maskable, que le système d'exploitation
 * rogne pour appliquer son propre masque.
 */
const MARK_RATIO = 640 / 416;

export function generateIconResponse(px: number, padding = 0) {
  const width = Math.round((px - padding * 2) * 0.82);
  const height = Math.round(width / MARK_RATIO);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu par satori, hors DOM */}
      <img src={getLogoMark()} width={width} height={height} alt="" />
    </div>,
    { width: px, height: px },
  );
}
