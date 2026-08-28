import Image from "next/image";

// Utilisable depuis un composant client comme depuis un Server Component : on lit
// directement `process.env.NEXT_PUBLIC_*` plutôt que `lib/env.ts`, qui valide des secrets
// serveur et casse au bundling client (voir AGENTS.md).
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BookList";

// Le fichier est recadré au plus près du dessin : sans marge parasite, centrer le glyphe
// sur la hauteur du texte suffit à les aligner optiquement.
const MARK_RATIO = 640 / 416;

const SIZES = {
  sm: { height: 17, text: "text-sm font-semibold tracking-tight" },
  md: { height: 21, text: "font-serif text-lg font-medium tracking-tight" },
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  /** À activer pour le logo d'en-tête, visible dès le premier rendu. */
  priority?: boolean;
  className?: string;
};

/**
 * Marque de l'application : le livre ouvert suivi du nom, dans le terracotta du logo. Le
 * glyphe est décoratif (`alt=""`) parce que le nom qui le suit porte déjà l'information
 * aux lecteurs d'écran.
 */
export function Logo({ size = "md", priority = false, className = "" }: LogoProps) {
  const { height, text } = SIZES[size];

  return (
    <span className={`text-brand inline-flex items-center gap-2 ${className}`}>
      {/* Le reset Tailwind force `height: auto` sur tout <img>, ce qui casse le ratio fixé
          par les attributs width/height de next/image (avertissement en dev). On fige donc
          les deux dimensions via `style`, aux mêmes valeurs que les attributs. */}
      <Image
        src="/logo-mark.png"
        alt=""
        width={Math.round(height * MARK_RATIO)}
        height={height}
        priority={priority}
        className="shrink-0"
        style={{ width: Math.round(height * MARK_RATIO), height }}
      />
      <span className={`${text} leading-none`}>{APP_NAME}</span>
    </span>
  );
}
