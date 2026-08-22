"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PasswordInput } from "@/components/PasswordInput"
import { AuthShell } from "@/components/AuthShell"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [success, setSuccess] = useState(false)

  // Le token vient de l'URL et ne change pas pendant la vie du composant :
  // pas besoin d'effet, l'absence de token se dérive directement au rendu.
  const error = submitError || (!token ? "Lien invalide ou expiré" : "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")

    if (password !== confirmPassword) {
      setSubmitError("Les mots de passe ne correspondent pas")
      return
    }

    if (password.length < 6) {
      setSubmitError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSubmitError(data.error || "Une erreur est survenue")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/auth/signin")
      }, 2000)
    } catch {
      setSubmitError("Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell subtitle="Nouveau mot de passe">
      {success ? (
        <div className="rounded-[--radius-sm] border border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-700">
          Mot de passe mis à jour. Redirection...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[--radius-sm] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">
              Nouveau mot de passe
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
              Confirmer
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={isLoading || !token} className="btn-primary w-full">
            {isLoading ? "Mise à jour..." : "Réinitialiser"}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default function ResetPassword() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

