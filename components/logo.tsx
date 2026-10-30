import { LOGO_COLORS, LOGO_SHAPES } from "@/lib/logo-mark";

// Utilisable depuis un composant client comme depuis un Server Component : on lit
// directement `process.env.NEXT_PUBLIC_*` plutôt que `lib/env.ts`, qui valide des secrets
// serveur et casse au bundling client (voir AGENTS.md).
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BookList";

const SIZES = {
  sm: { mark: 26, text: "text-[1.0625rem]" },
  md: { mark: 30, text: "text-[1.3125rem]" },
} as const;

type LogoProps = {
  size?: keyof typeof SIZES;
  /** Conservé pour les appels existants : le logo est un SVG en ligne, sans chargement. */
  priority?: boolean;
  className?: string;
};

/** Le dessin seul : l'étagère sur sa tuile terracotta. */
export function LogoMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  const { tile, paper, accent } = LOGO_COLORS;
  const { standing, leaning, width, bands, shelf } = LOGO_SHAPES;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill={tile} />
      {standing.map((book) => (
        <rect
          key={book.x}
          x={book.x}
          y={book.y}
          width={width}
          height={book.height}
          rx="1.6"
          fill={paper}
        />
      ))}
      <rect
        x={leaning.x}
        y={leaning.y}
        width={width}
        height={leaning.height}
        rx="1.6"
        fill={accent}
        transform={leaning.transform}
      />
      <path d={bands} stroke={tile} strokeWidth="1.3" strokeOpacity="0.5" />
      <rect
        x={shelf.x}
        y={shelf.y}
        width={shelf.width}
        height={shelf.height}
        rx="1.3"
        fill={paper}
      />
    </svg>
  );
}

/**
 * Logo complet : l'étagère suivie du nom, « Book » à l'encre et « List » en terracotta,
 * dans la serif de l'application. Le dessin est décoratif : le nom qui le suit porte déjà
 * l'information aux lecteurs d'écran.
 */
export function Logo({ size = "md", className = "" }: LogoProps) {
  const { mark, text } = SIZES[size];
  // « List » en couleur seulement pour le nom par défaut : un autre nom reste d'un seul ton.
  const splitAt = APP_NAME === "BookList" ? 4 : APP_NAME.length;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={mark} />
      <span
        className={`${text} font-serif leading-none font-semibold tracking-[-0.02em] text-stone-900`}
      >
        {APP_NAME.slice(0, splitAt)}
        <span className="text-brand">{APP_NAME.slice(splitAt)}</span>
      </span>
    </span>
  );
}
