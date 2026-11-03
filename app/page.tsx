import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/permissions";
import {
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
import { StickySignupCta } from "@/components/sticky-signup-cta";
import { env } from "@/lib/env";
import { FREE_BOOK_LIMIT, PREMIUM_PRICES } from "@/lib/plans";
// Vraies captures de l'application (compte de démonstration, voir drizzle/seed-demo.ts).
import dashboardShot from "@/public/screenshots/tableau-de-bord.webp";
import yearReviewShot from "@/public/screenshots/bilan-annuel.webp";
import statsShot from "@/public/screenshots/statistiques.webp";
import sagasShot from "@/public/screenshots/sagas.webp";

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
    title: "Import de votre bibliothèque",
    description:
      "Vous venez de Goodreads ou de StoryGraph, ou vous tenez vos lectures dans un tableur ? Déposez votre fichier CSV tel quel : statuts, notes et dates de lecture sont repris en une fois, même au-delà de 50 livres.",
  },
  {
    index: "06",
    title: "Application installable",
    description:
      "Installez BookList sur votre téléphone comme une vraie app, avec un accès hors ligne.",
  },
];

const SHOWCASE: { image: StaticImageData; alt: string; title: string; description: string }[] = [
  {
    image: yearReviewShot,
    alt: "Écran Bilan 2026 de BookList : 11 livres lus, 5 120 pages tournées, coup de cœur Station Eleven",
    title: "Un bilan à partager",
    description: "Votre année en une image, prête pour vos stories.",
  },
  {
    image: statsShot,
    alt: "Écran Statistiques de BookList : livres terminés par mois et répartition par genre",
    title: "Des statistiques claires",
    description: "Livres par mois, genres préférés, notes et auteurs.",
  },
  {
    image: sagasShot,
    alt: "Écran Sagas de BookList : la Chronique du tueur de roi, tome 1 lu, tome 2 en cours",
    title: "Vos sagas en ordre",
    description: "Le tome suivant toujours sous la main.",
  },
];

/** Cadre de téléphone autour d'une capture de l'application. */
function PhoneFrame({
  image,
  alt,
  sizes,
  preload = false,
  className = "",
}: {
  image: StaticImageData;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2.25rem] bg-stone-900 p-2 shadow-[0_2px_4px_rgba(36,29,21,0.12),0_32px_56px_-24px_rgba(36,29,21,0.55)] ${className}`}
    >
      <Image
        src={image}
        alt={alt}
        sizes={sizes}
        preload={preload}
        className="h-auto w-full rounded-[1.75rem]"
      />
    </div>
  );
}

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
        <section className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            {/* Pas d'animation d'entrée sur le texte : le titre est le plus grand élément du
                premier écran, le faire apparaître en fondu retardait son affichage (LCP). */}
            <div>
              <div className="bg-card mb-4 inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 sm:mb-6 sm:px-4 sm:py-1.5">
                Application de suivi de lecture
              </div>
              <h1 className="font-serif text-[2.5rem] leading-[1.05] text-balance text-stone-900 sm:text-6xl lg:text-7xl">
                Retrouvez le plaisir de lire, sans perdre le fil.
              </h1>
              <p className="mt-4 max-w-md text-base text-stone-500 sm:mt-6 sm:text-lg">
                Vos lectures, vos notes et vos statistiques, réunies dans un seul carnet.
              </p>
              <div
                id="hero-cta"
                className="mt-6 flex flex-col items-stretch gap-3 sm:mt-10 sm:flex-row sm:items-center"
              >
                <Link href="/register" className={buttonClasses("primary", "w-full sm:w-auto")}>
                  Créer un compte gratuit
                </Link>
                <a href="#tarifs" className={buttonClasses("secondary", "max-sm:hidden")}>
                  Voir les tarifs
                </a>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone-500 sm:text-sm">
                Sans carte bancaire · Import Goodreads ou StoryGraph (CSV) en un clic · Gratuit
                jusqu&apos;à {FREE_BOOK_LIMIT} livres, import toujours complet
              </p>
            </div>

            <div
              className="animate-fade-in-up relative mx-auto w-full max-w-[15rem] sm:max-w-[18rem] lg:max-w-[22rem]"
              style={{ animationDelay: "120ms" }}
            >
              <PhoneFrame
                image={yearReviewShot}
                alt=""
                sizes="216px"
                className="absolute top-10 -right-28 hidden w-[13.5rem] rotate-6 opacity-95 lg:block"
              />
              <PhoneFrame
                image={dashboardShot}
                alt="Accueil de BookList : la lecture en cours à 65 %, le compteur de pages et la suite de la pile"
                sizes="(min-width: 1024px) 288px, (min-width: 640px) 288px, 240px"
                preload
                className="relative w-full lg:w-[18rem]"
              />
            </div>
          </div>
        </section>

        <section className="bg-card border-y border-stone-200/70">
          <div className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-20">
            {/* Défilement horizontal sur mobile plutôt que trois téléphones empilés. */}
            <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0">
              {SHOWCASE.map((item) => (
                <li key={item.title} className="w-[68%] shrink-0 snap-center sm:w-auto">
                  <PhoneFrame
                    image={item.image}
                    alt={item.alt}
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 30vw, 68vw"
                  />
                  <h2 className="mt-5 font-serif text-lg text-stone-900">{item.title}</h2>
                  <p className="mt-1 text-sm text-stone-500">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
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

        <section id="final-cta" className="noise-overlay relative overflow-hidden bg-stone-900">
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

      <StickySignupCta heroId="hero-cta" finalId="final-cta" />

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
