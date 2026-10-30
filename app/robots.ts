import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const isPreview = env.NEXT_PUBLIC_IS_PREVIEW === "true";

  if (isPreview) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Espace connecté : rien à indexer, et inutile d'y envoyer les robots, renvoyés vers
      // la connexion.
      disallow: ["/admin", "/account", "/dashboard", "/books", "/api/", "/~offline"],
    },
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
