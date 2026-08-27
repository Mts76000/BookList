import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

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

// Hôtes des couvertures de livres. La v1 autorisait `img-src https:` en bloc ; on liste
// ici les seules sources réellement utilisées par la recherche Google Books et par les
// couvertures Open Library, pour ne pas rouvrir toute la surface HTTPS.
const bookCoverHosts = [
  "https://books.google.com",
  "https://books.googleusercontent.com",
  "https://covers.openlibrary.org",
  // Open Library redirige ses couvertures vers des serveurs Internet Archive dont le
  // sous-domaine change d'une image à l'autre (ia801601, ia601601...) : sans le joker,
  // la CSP bloque la quasi-totalité des couvertures.
  "https://archive.org",
  "https://*.archive.org",
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // blob: est nécessaire au scanner de code-barres, qui rend les images de la caméra
  // dans un canvas avant de les décoder.
  `img-src 'self' data: blob: https://lh3.googleusercontent.com ${bookCoverHosts}`,
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
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
    remotePatterns: [
      // Google account avatars (better-auth Google OAuth profile images)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Couvertures de livres
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "*.archive.org" },
    ],
  },
};

export default withSerwist(nextConfig);
