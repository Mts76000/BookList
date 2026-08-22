import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte BookList",
  // Les pages d'authentification (connexion, inscription, mot de passe) n'ont
  // pas de valeur SEO propre : on concentre l'indexation sur la landing page.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#f8f3ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">{children}</div>
  )
}
