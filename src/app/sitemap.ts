import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

const PUBLIC_PAGES = [
  { path: "", priority: 1, changeFrequency: "monthly" as const },
  { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/politique-confidentialite", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/conditions-utilisation", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/politique-cookies", priority: 0.3, changeFrequency: "yearly" as const },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
