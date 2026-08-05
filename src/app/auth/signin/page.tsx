"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { PasswordInput } from "@/components/PasswordInput"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Email ou mot de passe incorrect")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
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
          <p className="mt-2 text-sm text-stone-500">Connectez-vous à votre bibliothèque</p>
        </div>

        {registered && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Compte créé. Vous pouvez vous connecter.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>

          <p className="mt-3 text-center text-sm">
            <Link href="/auth/forgot-password" className="font-medium text-stone-600 hover:text-stone-900 hover:underline">
              Mot de passe oublié ?
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Pas encore de compte ?{" "}
          <Link href="/auth/signup" className="font-medium text-stone-900 hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
