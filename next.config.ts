import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// `unsafe-eval` n'est nécessaire qu'en développement : React s'en sert pour
// reconstruire les stacks d'erreur serveur dans le navigateur. Ni React ni
// Next.js n'en ont besoin en production (cf. doc Next.js sur la CSP), donc on
// ne l'autorise pas en prod pour réduire la surface d'attaque XSS.
const isDev = process.env.NODE_ENV === "development";
const UMAMI_ORIGIN = "https://umami-587uoxmh6bswbfvi2ihyi2zz.72.61.109.246.sslip.io";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${UMAMI_ORIGIN}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: http://books.google.com ${UMAMI_ORIGIN}`,
      "font-src 'self' data:",
      `connect-src 'self' https://www.googleapis.com https://books.google.com https://covers.openlibrary.org https://archive.org ${UMAMI_ORIGIN}`,
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSerwist(nextConfig);
