"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/button";

const STEPS = [
  {
    title: "Bienvenue sur BookList",
    description:
      "Votre bibliothèque personnelle pour suivre vos lectures, noter vos livres et visualiser votre évolution.",
    action: null,
  },
  {
    title: "Ajoutez vos premiers livres",
    description:
      "Scannez un code-barres, cherchez par titre ou auteur, ou ajoutez un livre manuellement.",
    action: { href: "/books/add", label: "Ajouter mon premier livre" },
  },
  {
    title: "Suivez votre activité",
    description:
      "Consultez vos stats, filtrez votre bibliothèque et découvrez vos auteurs et genres préférés.",
    action: { href: "/account", label: "Voir mon compte" },
  },
] as const;

interface OnboardingProps {
  /** Fourni par la page serveur : évite d'attendre la session côté client, donc le flash. */
  hasSeenOnboarding: boolean;
}

export function Onboarding({ hasSeenOnboarding }: OnboardingProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(!hasSeenOnboarding);
  const [step, setStep] = useState(0);

  function close() {
    setIsOpen(false);
    // Enregistrement en arrière-plan : revoir l'accueil une fois de trop est sans gravité,
    // bloquer la fermeture sur un appel réseau serait bien plus gênant.
    void fetch("/api/account/onboarding", { method: "POST" }).then(() => router.refresh());
  }

  if (!isOpen) return null;

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/30 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="animate-fade-in-up bg-card w-full max-w-sm rounded-[var(--radius-lg)] p-6 shadow-2xl ring-1 ring-stone-900/5"
      >
        <div className="mb-4 flex justify-between text-xs font-medium text-stone-400">
          <span>
            Étape {step + 1} / {STEPS.length}
          </span>
          <button type="button" onClick={close} className="text-stone-500 hover:text-stone-900">
            Passer
          </button>
        </div>

        <h2 id="onboarding-title" className="font-serif text-xl text-stone-900">
          {current.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{current.description}</p>

        {current.action && (
          <Link
            href={current.action.href}
            onClick={close}
            className={buttonClasses("primary", "mt-5 w-full")}
          >
            {current.action.label}
          </Link>
        )}

        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
              Retour
            </Button>
          )}
          <Button onClick={() => (isLastStep ? close() : setStep(step + 1))} className="flex-1">
            {isLastStep ? "C'est parti !" : "Suivant"}
          </Button>
        </div>
      </div>
    </div>
  );
}
