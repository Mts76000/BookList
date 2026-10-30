import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { APP_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: env.NEXT_PUBLIC_APP_NAME,
    short_name: env.NEXT_PUBLIC_APP_NAME,
    description: APP_DESCRIPTION,
    // Directement le tableau de bord : partir de l'accueil coûtait une redirection de plus
    // à chaque ouverture de la PWA. Sans session, le proxy renvoie vers la connexion.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f3ea",
    theme_color: "#ab4f27",
    lang: "fr",
    categories: ["books", "education", "productivity"],
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
