import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { Navigation } from "@/components/Navigation"
import { InstallGuide } from "@/components/InstallGuide"

export default async function InstallPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className={`min-h-screen bg-stone-50 pb-24 sm:pb-8 ${session ? "sm:pl-60" : ""}`}>
      {session ? (
        <Navigation />
      ) : (
        <header className="border-b border-stone-200/80 bg-white">
          <div className="mx-auto flex max-w-lg items-center px-4 py-4 sm:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
              BookList
            </Link>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        {session && (
          <Link
            href="/profile"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-stone-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour au profil
          </Link>
        )}

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-stone-900">
          Installer BookList
        </h1>
        <p className="mb-6 text-sm text-stone-500">
          Ajoutez BookList à votre écran d&apos;accueil pour l&apos;utiliser comme une vraie application,
          même hors ligne.
        </p>

        <InstallGuide />
      </main>
    </div>
  )
}
