"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Navigation } from "@/components/Navigation"

export default function Profile() {
  const { data: session, update } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(session?.user?.name || "")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) throw new Error("Failed")

      await update({ name })
      setMessage("Profil mis à jour")
      setIsEditing(false)
    } catch {
      setMessage("Erreur lors de la mise à jour")
    } finally {
      setIsLoading(false)
    }
  }

  const initials = (session?.user?.name || session?.user?.email || "?")
    .charAt(0)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8">
      <Navigation />
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900">Profil</h1>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 text-xl font-medium text-white">
              {initials}
            </div>
            <div>
              <h2 className="font-medium text-stone-900">
                {session?.user?.name || "Sans nom"}
              </h2>
              <p className="text-sm text-stone-500">{session?.user?.email}</p>
            </div>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                message.includes("mis à jour")
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {message}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Nom</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isLoading} className="btn-primary flex-1">
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setName(session?.user?.name || "")
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-secondary mt-6 w-full">
              Modifier le profil
            </button>
          )}
        </div>

        <div className="card mt-4 p-5 sm:p-6">
          <h3 className="text-sm font-medium text-stone-900">Compte</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-400">Email</dt>
              <dd className="text-stone-700">{session?.user?.email}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  )
}
