"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { PasswordInput } from "@/components/PasswordInput"

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [initialBooksRead, setInitialBooksRead] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || null,
          initialBooksRead: initialBooksRead ? parseInt(initialBooksRead) : 0,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.error === "User already exists"
            ? "Un compte existe déjà avec cet email"
            : "Une erreur est survenue"
        )
        setIsLoading(false)
        return
      }

      // Connexion automatique après l'inscription
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        // L'inscription a réussi mais la connexion auto a échoué, on redirige vers signin
        router.push("/auth/signin?registered=true")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Une erreur est survenue")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
            <BookIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">BookList</h1>
          <p className="mt-2 text-sm text-stone-500">Créez votre compte</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-700">
              Nom <span className="font-normal text-stone-400">(optionnel)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="input-field"
              placeholder="Votre nom"
            />
          </div>

          <div>
            <label htmlFor="initialBooksRead" className="mb-1.5 block text-sm font-medium text-stone-700">
              Livres déjà lus <span className="font-normal text-stone-400">(optionnel)</span>
            </label>
            <input
              id="initialBooksRead"
              type="number"
              value={initialBooksRead}
              onChange={(e) => setInitialBooksRead(e.target.value)}
              min="0"
              className="input-field"
              placeholder="Combien de livres avez-vous déjà lus ?"
            />
            <p className="mt-1 text-xs text-stone-400">
              Cela vous permettra de ne pas recommencer à zéro
            </p>
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input-field"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">
              Mot de passe
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="new-password"
              placeholder="6 caractères minimum"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-stone-700">
              Confirmer le mot de passe
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Déjà un compte ?{" "}
          <Link href="/auth/signin" className="font-medium text-stone-900 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
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
