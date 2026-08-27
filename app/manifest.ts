import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: env.NEXT_PUBLIC_APP_NAME,
    short_name: env.NEXT_PUBLIC_APP_NAME,
    description:
      "Socle Next.js générique : auth, email, analytics, sécurité, tests, prêt à l'emploi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    lang: "fr",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
