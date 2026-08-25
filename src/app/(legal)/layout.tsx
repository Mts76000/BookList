import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-50">
      <header className="glass sticky top-0 z-40 border-b border-stone-200/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-serif text-lg font-medium tracking-tight text-stone-900"
          >
            BookList
          </Link>
          <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <article className="max-w-none">
          {children}
        </article>
      </main>

      <footer className="border-t border-stone-200/70 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-stone-400 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-4">
            <Link href="/mentions-legales" className="hover:text-stone-600">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-stone-600">Confidentialité</Link>
            <Link href="/conditions-utilisation" className="hover:text-stone-600">Conditions d&apos;utilisation</Link>
            <Link href="/politique-cookies" className="hover:text-stone-600">Cookies</Link>
          </div>
          BookList — votre suivi de lecture personnel
        </div>
      </footer>
    </div>
  )
}
