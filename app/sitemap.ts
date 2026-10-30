import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Pages publiques indexables. Les dates de modification sont celles du contenu, mises à
 * jour à la main quand une page change : une date qui bouge à chaque visite n'apprend rien
 * aux moteurs de recherche, qui finissent par l'ignorer.
 */
const PAGES: {
  path: string;
  lastModified: string;
  changeFrequency: "monthly" | "yearly";
  priority: number;
}[] = [
  { path: "/", lastModified: "2026-10-30", changeFrequency: "monthly", priority: 1 },
  { path: "/tarifs", lastModified: "2026-10-30", changeFrequency: "monthly", priority: 0.8 },
  {
    path: "/alternative-goodreads",
    lastModified: "2026-10-30",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  { path: "/register", lastModified: "2026-10-30", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/notice", lastModified: "2026-10-30", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/terms", lastModified: "2026-10-30", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/privacy", lastModified: "2026-10-30", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/cookies", lastModified: "2026-10-30", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({
    url: new URL(page.path, env.NEXT_PUBLIC_APP_URL).toString(),
    lastModified: new Date(page.lastModified),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
