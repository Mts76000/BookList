"use client"

import { useState } from "react"
import Link from "next/link"
import { AuthShell } from "@/components/AuthShell"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue")
        return
      }

      setSent(true)
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell subtitle="Mot de passe oublié">
      {sent ? (
        <div className="rounded-[--radius-sm] border border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-700">
          Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[--radius-sm] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

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

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-stone-500">
        <Link href="/auth/signin" className="font-medium text-stone-900 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  )
}

