import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/permissions";
import {
  APP_DESCRIPTION,
  SEO_DESCRIPTION,
  applicationJsonLd,
  canonicalUrl,
  faqJsonLd,
  jsonLdScript,
} from "@/lib/seo";
import { FAQ, FaqSection, PricingSection } from "@/components/marketing";
import { buttonClasses } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { PublicHeader } from "@/components/public-header";
import { env } from "@/lib/env";
import { PREMIUM_PRICES } from "@/lib/plans";

const FEATURES = [
  {
    index: "01",
    title: "Suivi de lecture",
    description:
      "Gardez une trace de tous les livres que vous avez lus, avec vos notes et vos avis personnels.",
  },
  {
    index: "02",
    title: "Scan de code-barres",
    description:
      "Ajoutez un livre en un instant en scannant son ISBN directement avec l'appareil photo.",
  },
  {
    index: "03",
    title: "Objectif annuel",
    description:
      "Fixez-vous un nombre de livres pour l'année et voyez à chaque instant si vous tenez le rythme.",
  },
  {
    index: "04",
    title: "Bilan à partager",
    description:
      "Votre année de lecture résumée en une image prête pour vos stories : livres, pages, coup de cœur.",
  },
  {
    index: "05",
    title: "Import Goodreads et StoryGraph",
    description:
      "Déposez votre export tel quel : statuts, notes et dates de lecture sont repris en une fois.",
  },
  {
    index: "06",
    title: "Application installable",
    description:
      "Installez BookList sur votre téléphone comme une vraie app, avec un accès hors ligne.",
  },
];

const STEPS = [
  {
    title: "Scannez",
    description: "Utilisez l'appareil photo pour scanner le code-barres d'un livre.",
  },
  { title: "Notez", description: "Ajoutez votre avis, votre note et les dates de lecture." },
  { title: "Suivez", description: "Consultez vos stats et découvrez vos habitudes de lecture." },
];

export const metadata: Metadata = {
  title: {
    absolute: `${env.NEXT_PUBLIC_APP_NAME} : application de suivi de lecture et carnet de lecture`,
  },
  description: SEO_DESCRIPTION,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: `${env.NEXT_PUBLIC_APP_NAME} : votre carnet de lecture en ligne`,
    description: SEO_DESCRIPTION,
    url: canonicalUrl("/"),
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

export default async function HomePage() {
  // Un visiteur déjà connecté n'a rien à faire sur la page de présentation.
  if (await getOptionalSession()) redirect("/dashboard");

  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-50">
      <PublicHeader />

      <main id="main-content">
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div>
              <div className="animate-fade-in-up bg-card mb-6 inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-1.5 text-xs font-medium text-stone-500">
                Application de suivi de lecture
              </div>
              <h1
                className="animate-fade-in-up font-serif text-5xl leading-[1.05] text-balance text-stone-900 sm:text-6xl lg:text-7xl"
                style={{ animationDelay: "80ms" }}
              >
                Retrouvez le plaisir de lire, sans perdre le fil.
              </h1>
              <p
                className="animate-fade-in-up mt-6 max-w-md text-lg text-stone-500"
                style={{ animationDelay: "160ms" }}
              >
                {APP_DESCRIPTION}
              </p>
              <div
                className="animate-fade-in-up mt-10 flex flex-col items-start gap-3 sm:flex-row"
                style={{ animationDelay: "240ms" }}
              >
                <Link href="/register" className={buttonClasses("primary", "w-full sm:w-auto")}>
                  Créer un compte gratuit
                </Link>
                <a href="#tarifs" className={buttonClasses("secondary", "w-full sm:w-auto")}>
                  Voir les tarifs
                </a>
              </div>
            </div>

            {/* Quatre tranches de livres sur une étagère, aux couleurs de la palette. */}
            <div
              className="animate-fade-in-up relative mx-auto h-72 w-full max-w-sm sm:h-80"
              style={{ animationDelay: "200ms" }}
              aria-hidden="true"
            >
              <div className="absolute inset-0 flex items-end justify-center gap-3 sm:gap-4">
                <div className="h-[70%] w-16 -rotate-3 rounded-[var(--radius-sm)] bg-stone-800 shadow-[0_2px_2px_rgba(36,29,21,0.1),0_20px_30px_-16px_rgba(36,29,21,0.45)] sm:w-20" />
                <div className="bg-accent-500 h-[92%] w-16 rotate-2 rounded-[var(--radius-sm)] shadow-[0_2px_2px_rgba(36,29,21,0.1),0_24px_32px_-16px_rgba(171,79,39,0.4)] sm:w-20" />
                <div className="bg-moss-500 h-[60%] w-16 rotate-1 rounded-[var(--radius-sm)] shadow-[0_2px_2px_rgba(36,29,21,0.1),0_18px_28px_-16px_rgba(36,29,21,0.4)] sm:w-20" />
                <div className="h-[80%] w-16 -rotate-2 rounded-[var(--radius-sm)] bg-stone-300 shadow-[0_2px_2px_rgba(36,29,21,0.08),0_20px_28px_-16px_rgba(36,29,21,0.3)] sm:w-20" />
              </div>
              <div className="bg-card absolute top-2 -right-2 rounded-[var(--radius-sm)] border border-stone-200 px-3 py-2 text-xs shadow-[0_10px_24px_-14px_rgba(36,29,21,0.4)] sm:right-4">
                <p className="font-serif text-lg text-stone-900">128</p>
                <p className="text-stone-500">pages cette semaine</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card border-y border-stone-200/70">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            {FEATURES.map((feature) => (
              <div
                key={feature.index}
                className="flex flex-col gap-2 border-b border-stone-200 py-7 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <span className="font-serif text-sm text-stone-300 sm:w-10">{feature.index}</span>
                <h2 className="font-serif text-xl text-stone-900 sm:w-56 sm:shrink-0">
                  {feature.title}
                </h2>
                <p className="text-sm leading-relaxed text-stone-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 className="font-serif text-3xl text-stone-900 sm:text-4xl">Comment ça marche ?</h2>
          <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
            <div className="absolute top-[13px] right-0 left-0 hidden h-px bg-stone-200 sm:block" />
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="relative z-10 mb-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-stone-50 font-serif text-sm text-stone-900 ring-1 ring-stone-300">
                  {index + 1}
                </div>
                <h3 className="font-serif text-lg text-stone-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <PricingSection />

        <FaqSection />

        <section className="noise-overlay relative overflow-hidden bg-stone-900">
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <h2 className="font-serif text-3xl text-stone-50 sm:text-4xl">Prêt à commencer ?</h2>
            <p className="mx-auto mt-4 max-w-md text-stone-400">
              Rejoignez BookList et donnez à vos lectures la place qu&apos;elles méritent.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="hover:bg-accent-100 inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-stone-50 px-6 py-3 text-sm font-medium tracking-tight text-stone-900 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.6)]"
              >
                Créer un compte gratuit
              </Link>
            </div>
          </div>
        </section>
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
