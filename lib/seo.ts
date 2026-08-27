import { env } from "@/lib/env";

/** Description du produit, partagée par les métadonnées, le manifest et l'image OG. */
export const APP_DESCRIPTION =
  "BookList vous aide à suivre vos lectures, noter vos coups de cœur et visualiser votre évolution au fil du temps.";

/** Builds an absolute canonical URL from a path, for Metadata.alternates.canonical. */
export function canonicalUrl(path = "/"): string {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

/** Minimal JSON-LD Organization boilerplate — extend per project (Product, WebSite, etc.). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: env.NEXT_PUBLIC_APP_NAME,
    url: env.NEXT_PUBLIC_APP_URL,
  };
}
