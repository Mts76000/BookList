import { env } from "@/lib/env";

/** Description du produit, partagée par les métadonnées, le manifest et l'image OG. */
export const APP_DESCRIPTION =
  "BookList vous aide à suivre vos lectures, noter vos coups de cœur et visualiser votre évolution au fil du temps.";

/** Builds an absolute canonical URL from a path, for Metadata.alternates.canonical. */
export function canonicalUrl(path = "/"): string {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

/**
 * Description pour les moteurs de recherche : moins de 160 caractères, avec les termes que
 * cherchent les lecteurs (suivi de lecture, carnet de lecture, Goodreads).
 */
export const SEO_DESCRIPTION =
  "Application gratuite de suivi de lecture : carnet de lecture, objectifs, statistiques, sagas et import Goodreads. Scannez vos livres et suivez vos lectures.";

/** Organisation et site, déclarés sur toutes les pages (voir app/layout.tsx). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${env.NEXT_PUBLIC_APP_URL}/#organization`,
        name: env.NEXT_PUBLIC_APP_NAME,
        url: env.NEXT_PUBLIC_APP_URL,
        logo: canonicalUrl("/pwa-icon-512"),
      },
      {
        "@type": "WebSite",
        "@id": `${env.NEXT_PUBLIC_APP_URL}/#website`,
        name: env.NEXT_PUBLIC_APP_NAME,
        url: env.NEXT_PUBLIC_APP_URL,
        inLanguage: "fr-FR",
        publisher: { "@id": `${env.NEXT_PUBLIC_APP_URL}/#organization` },
      },
    ],
  };
}

/** L'application et ses offres, aux prix de lib/plans.ts. */
export function applicationJsonLd(prices: { name: string; value: number }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: env.NEXT_PUBLIC_APP_NAME,
    url: env.NEXT_PUBLIC_APP_URL,
    description: SEO_DESCRIPTION,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web, iOS, Android",
    inLanguage: "fr-FR",
    offers: prices.map((price) => ({
      "@type": "Offer",
      name: price.name,
      price: price.value.toFixed(2),
      priceCurrency: "EUR",
    })),
  };
}

/** Questions fréquentes, pour les résultats enrichis des moteurs de recherche. */
export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Balise JSON-LD prête à insérer dans une page. */
export function jsonLdScript(data: object): { __html: string } {
  // `<` échappé : un texte contenant « </script> » ne peut pas fermer la balise.
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
