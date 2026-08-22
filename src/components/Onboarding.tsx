"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

const STEPS = [
  {
    title: "Bienvenue sur BookList",
    description:
      "Votre bibliothèque personnelle pour suivre vos lectures, noter vos livres et visualiser votre évolution.",
  },
  {
    title: "Ajoutez vos premiers livres",
    description:
      "Scannez un code-barres, cherchez par titre ou auteur, ou ajoutez un livre manuellement.",
  },
  {
    title: "Suivez votre activité",
    description:
      "Consultez vos stats, filtrez votre bibliothèque et découvrez vos auteurs et genres préférés.",
  },
]

export function Onboarding() {
  const { data: session, update } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)

  // `session` est chargée de façon asynchrone côté client (NextAuth) : elle vaut
  // `undefined` puis se peuple après un appel réseau. On ne peut pas dériver
  // `isOpen` directement au rendu sans provoquer un flash du modal à chaque
  // changement de page ; l'effet ne se déclenche donc qu'une fois la session connue.
  useEffect(() => {
    if (session?.user && !session.user.hasSeenOnboarding) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true)
    }
  }, [session])

  const markAsSeen = async () => {
    try {
      await fetch("/api/user/onboarding", { method: "PATCH" })
      await update({ hasSeenOnboarding: true })
    } catch {
      // ignore
    }
  }

  const handleClose = () => {
    markAsSeen()
    setIsOpen(false)
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/30 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-fade-in-up w-full max-w-sm rounded-[--radius-lg] bg-(--surface) p-6 shadow-2xl ring-1 ring-stone-900/5">
        <div className="mb-4 flex justify-between text-xs font-medium text-stone-400">
          <span>Étape {step + 1} / {STEPS.length}</span>
          <button onClick={handleClose} className="text-stone-500 hover:text-stone-900">
            Passer
          </button>
        </div>

        <h2 className="font-serif text-xl text-stone-900">{STEPS[step].title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{STEPS[step].description}</p>

        {step === 1 && (
          <Link
            href="/books/add"
            onClick={handleClose}
            className="mt-5 block rounded-[--radius-sm] bg-stone-900 px-4 py-3 text-center text-sm font-medium text-stone-50 transition hover:bg-accent-600"
          >
            Ajouter mon premier livre
          </Link>
        )}

        {step === 2 && (
          <Link
            href="/profile"
            onClick={handleClose}
            className="mt-5 block rounded-[--radius-sm] bg-stone-900 px-4 py-3 text-center text-sm font-medium text-stone-50 transition hover:bg-accent-600"
          >
            Voir mon profil
          </Link>
        )}

        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex-1"
            >
              Retour
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={handleNext} className="btn-primary flex-1">
              Suivant
            </button>
          ) : (
            <button onClick={handleNext} className="btn-primary flex-1">
              C&apos;est parti !
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
