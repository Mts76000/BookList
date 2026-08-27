import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Only public, indexable pages. Auth pages and /account are low-value for search indexing
// and are left out on purpose.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: env.NEXT_PUBLIC_APP_URL,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...["/legal/notice", "/legal/terms", "/legal/privacy", "/legal/cookies"].map((path) => ({
      url: `${env.NEXT_PUBLIC_APP_URL}${path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
