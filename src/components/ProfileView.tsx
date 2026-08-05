"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

interface ProfileViewProps {
  name: string | null
  email: string
  memberSince: Date | null
  initialBooksRead: number
  totalBooks: number
  totalPagesRead: number
  averageRating: number
  commentsCount: number
  topAuthor: string | null
  topAuthorCount: number
  favoriteGenre: string | null
  pagesPerYear: { year: number; pages: number }[]
}

export function ProfileView({
  name,
  email,
  memberSince,
  initialBooksRead,
  totalBooks,
  totalPagesRead,
  averageRating,
  commentsCount,
  topAuthor,
  topAuthorCount,
  favoriteGenre,
  pagesPerYear,
}: ProfileViewProps) {
  const router = useRouter()
  const { update } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [formName, setFormName] = useState(name || "")
  const [formInitialBooks, setFormInitialBooks] = useState(initialBooksRead.toString())
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          initialBooksRead: formInitialBooks,
        }),
      })

      if (!response.ok) throw new Error("Failed")

      await update({ name: formName })
      setMessage("Profil mis à jour")
      setIsError(false)
      setIsEditing(false)
      router.refresh()
    } catch {
      setMessage("Erreur lors de la mise à jour")
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut({ callbackUrl: "/auth/signin" })
  }

  const initials = (name || email || "?").charAt(0).toUpperCase()

  const stats = [
    { label: "Livres lus", value: totalBooks, accent: "bg-blue-500" },
    { label: "Pages lues", value: totalPagesRead, accent: "bg-violet-500" },
    { label: "Note moyenne", value: averageRating > 0 ? averageRating.toFixed(1) : "—", accent: "bg-sky-500" },
    { label: "Commentaires", value: commentsCount, accent: "bg-emerald-500" },
  ]

  return (
    <>
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xl font-medium text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-medium text-stone-900">{name || "Sans nom"}</h2>
            <p className="truncate text-sm text-stone-500">{email}</p>
            {memberSince && (
              <p className="mt-0.5 text-xs text-stone-400">
                Membre depuis {new Date(memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              isError
                ? "border border-red-200 bg-red-50 text-red-600"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
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
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Livres déjà lus avant BookList
              </label>
              <input
                type="number"
                min="0"
                value={formInitialBooks}
                onChange={(e) => setFormInitialBooks(e.target.value)}
                className="input-field"
              />
              <p className="mt-1 text-xs text-stone-400">
                Ajouté à votre compteur total sans recommencer à zéro.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isLoading} className="btn-primary flex-1">
                {isLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setFormName(name || "")
                  setFormInitialBooks(initialBooksRead.toString())
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className={`mb-2 h-1.5 w-8 rounded-full ${stat.accent}`} />
            <p className="text-xl font-semibold tabular-nums text-stone-900">{stat.value}</p>
            <p className="mt-0.5 text-xs text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <h3 className="text-sm font-medium text-stone-900">Détails</h3>
        <dl className="mt-3 space-y-2 text-sm text-stone-500">
          {topAuthor && (
            <div className="flex justify-between">
              <dt>Auteur le plus lu</dt>
              <dd className="font-medium text-stone-900">{topAuthor} ({topAuthorCount})</dd>
            </div>
          )}
          {favoriteGenre && (
            <div className="flex justify-between">
              <dt>Genre favori</dt>
              <dd className="font-medium text-stone-900">{favoriteGenre}</dd>
            </div>
          )}
        </dl>

        {pagesPerYear.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-medium text-stone-900">Pages par année</h3>
            <dl className="mt-3 space-y-2 text-sm text-stone-500">
              {pagesPerYear.map(({ year, pages }) => (
                <div key={year} className="flex justify-between">
                  <dt>{year}</dt>
                  <dd className="font-medium text-stone-900">{pages} pages</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>

      <Link
        href="/install"
        className="card card-interactive mt-4 flex items-center justify-between p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white shadow-sm">
            <DownloadIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">Installer l&apos;application</p>
            <p className="text-xs text-stone-500">Accédez à BookList depuis votre écran d&apos;accueil</p>
          </div>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
      </Link>

      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="card mt-4 flex w-full items-center justify-center gap-2 p-4 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50/70 disabled:opacity-50"
      >
        <LogoutIcon className="h-4 w-4" />
        {isSigningOut ? "Déconnexion..." : "Déconnexion"}
      </button>
    </>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H15"
      />
    </svg>
  )
}
