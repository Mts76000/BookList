import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/permissions";
import { applicationJsonLd, canonicalUrl, faqJsonLd, jsonLdScript } from "@/lib/seo";
import { FAQ, FaqSection, PricingSection } from "@/components/marketing";
import { PublicHeader } from "@/components/public-header";
import { Footer } from "@/components/footer";
import { PREMIUM_PRICES, TRIAL_DAYS } from "@/lib/plans";

const description = `BookList est gratuit pour suivre vos lectures. Premium : ${PREMIUM_PRICES.monthly.amount} par mois ou ${PREMIUM_PRICES.yearly.amount} par an, avec ${TRIAL_DAYS} jours d'essai gratuit et sans engagement.`;

export const metadata: Metadata = {
  title: "Tarifs : gratuit, ou Premium dès 2 € par mois",
  description,
  alternates: { canonical: canonicalUrl("/tarifs") },
  openGraph: {
    title: "Tarifs BookList : gratuit, ou Premium dès 2 € par mois",
    description,
    url: canonicalUrl("/tarifs"),
  },
};

const structuredData = [
  applicationJsonLd([
    { name: "Gratuit", value: 0 },
    { name: "Premium mensuel", value: PREMIUM_PRICES.monthly.value },
    { name: "Premium annuel", value: PREMIUM_PRICES.yearly.value },
  ]),
  faqJsonLd(FAQ),
];

/** Page Tarifs : la grille des formules et les questions fréquentes, à une adresse propre. */
export default async function PricingPage() {
  // Un lecteur connecté choisit sa formule depuis son compte, où l'essai se lance.
  if (await getOptionalSession()) redirect("/account#premium");

  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-50">
      <PublicHeader />
      <main id="main-content">
        <PricingSection headingLevel="h1" />
        <FaqSection />
      </main>
      <Footer />
      {structuredData.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(data)}
        />
      ))}
    </div>
  );
}
