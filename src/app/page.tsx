import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"

const FEATURES = [
  {
    title: "Suivi de lecture",
    description: "Gardez une trace de tous les livres que vous avez lus, avec vos notes et vos avis personnels.",
    icon: BookIcon,
  },
  {
    title: "Scan de code-barres",
    description: "Ajoutez un livre en un instant en scannant son ISBN directement avec l'appareil photo.",
    icon: BarcodeIcon,
  },
  {
    title: "Statistiques de lecture",
    description: "Visualisez votre activité jour par jour et suivez vos objectifs de lecture au fil du temps.",
    icon: ChartIcon,
  },
  {
    title: "Application installable",
    description: "Installez BookList sur votre téléphone comme une vraie app, avec un accès hors ligne.",
    icon: DeviceIcon,
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
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight text-stone-900">📖 BookList</span>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-8 pt-14 text-center sm:px-6 sm:pb-12 sm:pt-20">
          <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
            Retrouvez le plaisir de lire, sans perdre le fil.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-stone-500 sm:text-lg">
            BookList vous aide à suivre vos lectures, noter vos coups de cœur et visualiser votre évolution au fil du temps.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/signup" className="btn-primary w-full sm:w-auto">
              Créer un compte gratuit
            </Link>
            <Link href="/auth/signin" className="btn-secondary w-full sm:w-auto">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card p-5 sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-medium text-stone-900">{feature.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-stone-200/80 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Comment ça marche ?
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-lg font-semibold text-white">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 font-medium text-stone-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-stone-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Prêt à commencer ?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-stone-500">
              Rejoignez BookList et donnez à vos lectures la place qu&apos;elles méritent.
            </p>
            <div className="mt-6">
              <Link href="/auth/signup" className="btn-primary">
                Créer mon compte
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200/80">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-stone-400 sm:px-6">
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
