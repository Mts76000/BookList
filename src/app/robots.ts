import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

// BookList est un outil personnel : seule la page d'accueil publique a une
// valeur SEO. Le reste (app authentifiée, routes API, liens de réinitialisation
// de mot de passe) est explicitement exclu de l'indexation.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/books", "/profile", "/install", "/auth/", "/~offline"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
