import Link from "next/link"

interface AuthShellProps {
  subtitle: string
  children: React.ReactNode
}

/**
 * Structure commune aux 4 pages d'authentification (signin, signup,
 * forgot-password, reset-password) : wordmark, sous-titre, colonne centrée.
 * Centralise ce gabarit pour éviter de le dupliquer dans chaque page.
 */
export function AuthShell({ subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-serif text-2xl text-stone-900">
            BookList
          </Link>
          <p className="mt-2 text-sm text-stone-500">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
