import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

// Seule la landing page publique a une valeur SEO ; le reste de l'app est
// privé et authentifié (voir robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ]
}
