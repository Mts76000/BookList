import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/site"

const FEATURES = [
  {
    index: "01",
    title: "Suivi de lecture",
    description: "Gardez une trace de tous les livres que vous avez lus, avec vos notes et vos avis personnels.",
  },
  {
    index: "02",
    title: "Scan de code-barres",
    description: "Ajoutez un livre en un instant en scannant son ISBN directement avec l'appareil photo.",
  },
  {
    index: "03",
    title: "Statistiques de lecture",
    description: "Visualisez votre activité jour par jour et suivez vos objectifs de lecture au fil du temps.",
  },
  {
    index: "04",
    title: "Application installable",
    description: "Installez BookList sur votre téléphone comme une vraie app, avec un accès hors ligne.",
  },
]

const STEPS = [
  { title: "Scannez", description: "Utilisez l'appareil photo pour scanner le code-barres d'un livre." },
  { title: "Notez", description: "Ajoutez votre avis, votre note et les dates de lecture." },
  { title: "Suivez", description: "Consultez vos stats et découvrez vos habitudes de lecture." },
]

export const metadata: Metadata = {
  title: `${SITE_NAME} — Suivez vos lectures`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { "@type": "Organization", name: SITE_NAME },
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
    },
  ],
}

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-50">
      <header className="glass sticky top-0 z-50 border-b border-stone-200/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="font-serif text-lg font-medium tracking-tight text-stone-900">BookList</span>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-stone-900"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div>
              <div className="animate-fade-in-up mb-6 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-(--surface) px-4 py-1.5 text-xs font-medium text-stone-500">
                Votre bibliothèque, réinventée
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
                BookList vous aide à suivre vos lectures, noter vos coups de cœur et
                visualiser votre évolution au fil du temps.
              </p>
              <div
                className="animate-fade-in-up mt-10 flex flex-col items-start gap-3 sm:flex-row"
                style={{ animationDelay: "240ms" }}
              >
                <Link href="/auth/signup" className="btn-primary w-full sm:w-auto">
                  Créer un compte gratuit
                </Link>
                <Link href="/auth/signin" className="btn-secondary w-full sm:w-auto">
                  J&apos;ai déjà un compte
                </Link>
              </div>
            </div>

            <div className="animate-fade-in-up relative mx-auto h-72 w-full max-w-sm sm:h-80" style={{ animationDelay: "200ms" }}>
              <div className="absolute inset-0 flex items-end justify-center gap-3 sm:gap-4">
                <div className="h-[70%] w-16 -rotate-3 rounded-[--radius-sm] bg-stone-800 shadow-[0_2px_2px_rgba(36,29,21,0.1),0_20px_30px_-16px_rgba(36,29,21,0.45)] sm:w-20" />
                <div className="h-[92%] w-16 rotate-2 rounded-[--radius-sm] bg-accent-500 shadow-[0_2px_2px_rgba(36,29,21,0.1),0_24px_32px_-16px_rgba(171,79,39,0.4)] sm:w-20" />
                <div className="h-[60%] w-16 rotate-1 rounded-[--radius-sm] bg-moss-500 shadow-[0_2px_2px_rgba(36,29,21,0.1),0_18px_28px_-16px_rgba(36,29,21,0.4)] sm:w-20" />
                <div className="h-[80%] w-16 -rotate-2 rounded-[--radius-sm] bg-stone-300 shadow-[0_2px_2px_rgba(36,29,21,0.08),0_20px_28px_-16px_rgba(36,29,21,0.3)] sm:w-20" />
              </div>
              <div className="absolute -right-2 top-2 rounded-[--radius-sm] border border-stone-200 bg-(--surface) px-3 py-2 text-xs shadow-[0_10px_24px_-14px_rgba(36,29,21,0.4)] sm:right-4">
                <p className="font-serif text-lg text-stone-900">128</p>
                <p className="text-stone-500">pages cette semaine</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-stone-200/70 bg-(--surface)">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            {FEATURES.map((feature) => (
              <div
                key={feature.index}
                className="flex flex-col gap-2 border-b border-stone-200 py-7 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <span className="font-serif text-sm text-stone-300 sm:w-10">{feature.index}</span>
                <h2 className="font-serif text-xl text-stone-900 sm:w-56 sm:shrink-0">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-stone-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
          <h2 className="font-serif text-3xl text-stone-900 sm:text-4xl">Comment ça marche ?</h2>
          <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
            <div className="absolute left-0 right-0 top-[13px] hidden h-px bg-stone-200 sm:block" />
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="relative z-10 mb-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-stone-50 font-serif text-sm text-stone-900 ring-1 ring-stone-300">
                  {i + 1}
                </div>
                <h3 className="font-serif text-lg text-stone-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="noise-overlay relative overflow-hidden bg-stone-900">
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <h2 className="font-serif text-3xl text-stone-50 sm:text-4xl">Prêt à commencer ?</h2>
            <p className="mx-auto mt-4 max-w-md text-stone-400">
              Rejoignez BookList et donnez à vos lectures la place qu&apos;elles méritent.
            </p>
            <div className="mt-8">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-[--radius-sm] bg-stone-50 px-6 py-3 text-sm font-medium tracking-tight text-stone-900 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-100 hover:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.6)]"
              >
                Créer mon compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200/70 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-500">
            <Link href="/mentions-legales" className="hover:text-stone-900">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-stone-900">Confidentialité</Link>
            <Link href="/conditions-utilisation" className="hover:text-stone-900">Conditions d&apos;utilisation</Link>
            <Link href="/politique-cookies" className="hover:text-stone-900">Cookies</Link>
          </div>
          <p className="text-xs text-stone-400">BookList — votre suivi de lecture personnel</p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
