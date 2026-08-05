import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"

const FEATURES = [
  {
    title: "Suivi de lecture",
    description: "Gardez une trace de tous les livres que vous avez lus, avec vos notes et vos avis personnels.",
    icon: BookIcon,
    bg: "bg-blue-100",
    color: "text-blue-600",
  },
  {
    title: "Scan de code-barres",
    description: "Ajoutez un livre en un instant en scannant son ISBN directement avec l'appareil photo.",
    icon: BarcodeIcon,
    bg: "bg-violet-100",
    color: "text-violet-600",
  },
  {
    title: "Statistiques de lecture",
    description: "Visualisez votre activité jour par jour et suivez vos objectifs de lecture au fil du temps.",
    icon: ChartIcon,
    bg: "bg-emerald-100",
    color: "text-emerald-600",
  },
  {
    title: "Application installable",
    description: "Installez BookList sur votre téléphone comme une vraie app, avec un accès hors ligne.",
    icon: DeviceIcon,
    bg: "bg-amber-100",
    color: "text-amber-600",
  },
]

const STEPS = [
  { title: "Scannez", description: "Utilisez l'appareil photo pour scanner le code-barres d'un livre." },
  { title: "Notez", description: "Ajoutez votre avis, votre note et les dates de lecture." },
  { title: "Suivez", description: "Consultez vos stats et découvrez vos habitudes de lecture." },
]

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-50">
      <header className="glass sticky top-0 z-50 border-b border-stone-200/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight text-stone-900">BookList</span>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-stone-900"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main>
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center blur-3xl"
          >
            <div className="aspect-square w-[46rem] rounded-full bg-[conic-gradient(from_140deg,theme(colors.sky.200),theme(colors.violet.200),theme(colors.emerald.100),theme(colors.sky.200))] opacity-40" />
          </div>

          <div className="mx-auto max-w-3xl px-4 pb-12 pt-20 text-center sm:px-6 sm:pb-16 sm:pt-32">
            <div className="animate-fade-in-up mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-stone-500 shadow-sm">
              Votre bibliothèque, réinventée
            </div>
            <h1
              className="animate-fade-in-up text-5xl font-semibold tracking-tight text-balance text-stone-900 sm:text-7xl"
              style={{ animationDelay: "80ms" }}
            >
              Retrouvez le plaisir de lire,
              <br className="hidden sm:block" /> sans perdre le fil.
            </h1>
            <p
              className="animate-fade-in-up mx-auto mt-6 max-w-xl text-lg text-stone-500"
              style={{ animationDelay: "160ms" }}
            >
              BookList vous aide à suivre vos lectures, noter vos coups de cœur et
              visualiser votre évolution au fil du temps.
            </p>
            <div
              className="animate-fade-in-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
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
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card card-interactive p-6 sm:p-7">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${feature.bg} ${feature.color}`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 font-semibold tracking-tight text-stone-900">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-stone-200/70 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Comment ça marche ?
            </h2>
            <div className="mt-14 grid gap-10 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-xl font-semibold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.4)]">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 font-semibold tracking-tight text-stone-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-stone-900">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 flex justify-center blur-3xl"
          >
            <div className="aspect-square w-[36rem] translate-y-[-40%] rounded-full bg-gradient-to-tr from-sky-800 via-violet-800 to-transparent opacity-40" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Prêt à commencer ?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-stone-300">
              Rejoignez BookList et donnez à vos lectures la place qu&apos;elles méritent.
            </p>
            <div className="mt-8">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium tracking-tight text-stone-900 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.6)]"
              >
                Créer mon compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200/70 bg-stone-50">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-stone-400 sm:px-6">
          BookList — votre suivi de lecture personnel
        </div>
      </footer>
    </div>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function BarcodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.25v13.5m3-13.5v13.5m4.5-13.5v13.5M15 5.25v13.5m1.5-13.5v13.5m3-13.5v13.5M4 5.25h16.5M4 18.75h16.5" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  )
}
