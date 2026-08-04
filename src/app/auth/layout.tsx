import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Connexion - BookList",
  description: "Connectez-vous à votre compte BookList",
}

export const viewport: Viewport = {
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">{children}</div>
  )
}
