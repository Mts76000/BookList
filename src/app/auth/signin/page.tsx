"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { PasswordInput } from "@/components/PasswordInput"
import { AuthShell } from "@/components/AuthShell"

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
    <AuthShell subtitle="Connectez-vous à votre bibliothèque">
      {registered && (
        <div className="mb-4 rounded-[--radius-sm] border border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-700">
          Compte créé. Vous pouvez vous connecter.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[--radius-sm] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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
    </AuthShell>
  )
}

export default function SignIn() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}

