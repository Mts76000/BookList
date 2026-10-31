"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api-client";
import { buttonClasses } from "@/components/ui/button";
import { TrialButton } from "@/components/trial-button";

export interface PlanSummary {
  isPremium: boolean;
  trialAvailable: boolean;
  bookCount: number;
  bookLimit: number | null;
  remaining: number | null;
}

/** Plan de l'utilisateur, `null` pendant le chargement. */
export function usePlan(): [PlanSummary | null, () => void] {
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void apiFetch<PlanSummary>("/api/billing/plan").then((result) => {
      if (result.ok) setPlan(result.data);
    });
  }, [version]);

  return [plan, () => setVersion((v) => v + 1)];
}

/** Seuil à partir duquel on prévient que la bibliothèque gratuite se remplit. */
const WARNING_THRESHOLD = 5;

/**
 * Bandeau de limite du compte gratuit : discret quand il reste quelques places, bloquant
 * (avec l'offre) quand il n'en reste plus. Rien pour un compte Premium.
 */
export function BookLimitNotice({ plan }: { plan: PlanSummary | null }) {
  if (!plan || plan.isPremium || plan.remaining === null || plan.bookLimit === null) return null;

  if (plan.remaining === 0) {
    return (
      <div className="card mb-6 p-5 text-center sm:p-6">
        <span className="bg-accent-50 text-accent-700 mx-auto flex size-11 items-center justify-center rounded-full">
          <Crown size={22} weight="duotone" aria-hidden="true" />
        </span>
        <h2 className="mt-3 font-serif text-xl text-stone-900">
          Votre bibliothèque gratuite est pleine
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
          Vous avez atteint {plan.bookLimit} livres. Passez à Premium pour une bibliothèque
          illimitée, les statistiques avancées et les bilans personnalisés.
        </p>
        {plan.trialAvailable ? (
          <div className="mt-5 flex flex-col items-center gap-1">
            <TrialButton />
            <p className="text-xs text-stone-400">Aucun prélèvement pendant l&apos;essai</p>
          </div>
        ) : (
          <Link href="/account/premium" className={buttonClasses("primary", "mt-5")}>
            Découvrir Premium
          </Link>
        )}
      </div>
    );
  }

  if (plan.remaining > WARNING_THRESHOLD) return null;

  return (
    <p className="border-accent-200 bg-accent-50 text-accent-800 mb-6 rounded-[var(--radius-sm)] border px-4 py-3 text-sm">
      Plus que {plan.remaining} livre{plan.remaining > 1 ? "s" : ""} avant la limite du compte
      gratuit ({plan.bookLimit}).{" "}
      <Link href="/account/premium" className="font-medium underline underline-offset-2">
        Passer à Premium
      </Link>
    </p>
  );
}
