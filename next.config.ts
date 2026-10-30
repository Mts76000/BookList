import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import { OPTIMIZED_COVER_HOSTNAMES } from "./lib/cover-hosts";

// CSP whitelist rationale:
// - 'self' + inline styles/scripts: Next.js/Tailwind require these for hydration.
// - stats.mathis-lamotte.fr: self-hosted Umami analytics script (lib/umami.ts).
// - challenges.cloudflare.com: Turnstile widget + its iframe challenge.
// - accounts.google.com: Google OAuth (better-auth socialProviders.google).
// - The Buy Me a Coffee button (components/buy-me-a-coffee.tsx) is a plain outbound link,
//   not an embedded script/iframe, so it needs no CSP allowance.
// - 'unsafe-eval' in script-src: non-production only. React dev mode (`next dev`, which
//   also backs the "test" env used by Playwright's webServer — see playwright.config.ts)
//   uses eval() to reconstruct callstacks across environments (Fast Refresh, component
//   stacks); it never does in a production build, so this is left out of the prod CSP.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : null,
  "https://stats.mathis-lamotte.fr",
  "https://challenges.cloudflare.com",
]
  .filter(Boolean)
  .join(" ");

// Hôtes des couvertures de livres fournies par la recherche (lib/cover-hosts.ts) : seuls
// eux passent par l'optimiseur d'images, et le service worker n'a besoin de les joindre que
// pour les mettre en cache hors-ligne.
const bookCoverHosts = OPTIMIZED_COVER_HOSTNAMES.map((host) => `https://${host}`).join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // blob: est nécessaire au scanner de code-barres, qui rend les images de la caméra
  // dans un canvas avant de les décoder. https: : une couverture saisie à la main peut venir
  // de n'importe quel site et se charge directement dans le navigateur (voir
  // lib/cover-hosts.ts). Une image ne peut rien exécuter ; script-src et connect-src restent,
  // eux, limités à une liste.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://stats.mathis-lamotte.fr https://www.googleapis.com ${bookCoverHosts}`,
  // media-src blob: : le flux vidéo de la caméra pour le scan d'ISBN.
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    // camera=(self) : indispensable au scan de code-barres (components/BarcodeScanner).
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Lean production image for the multi-stage Dockerfile (see Dockerfile).
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Les couvertures passent par l'optimiseur (voir components/book-cover.tsx) : téléchargées
    // une fois, converties en WebP à la taille affichée et gardées sur le disque du serveur.
    // Une couverture ne change pas pour une même URL : on la garde 31 jours.
    minimumCacheTTL: 31 * 24 * 60 * 60,
    formats: ["image/webp"],
    maximumDiskCacheSize: 500_000_000,
    // Une couverture pèse quelques centaines de Ko : inutile d'accepter les 50 Mo par défaut.
    maximumResponseBody: 5_000_000,
    remotePatterns: [
      // Google account avatars (better-auth Google OAuth profile images)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Couvertures de livres issues de la recherche
      ...OPTIMIZED_COVER_HOSTNAMES.map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
  },
};

export default withSerwist(nextConfig);
