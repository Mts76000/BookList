import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/mentions-legales", "/politique-confidentialite", "/conditions-utilisation", "/politique-cookies"],
      disallow: ["/api/", "/dashboard", "/books", "/profile", "/install", "/auth/", "/~offline"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
