"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { PREMIUM_PRICES, TRIAL_DAYS, type BillingInterval } from "@/lib/plans";

/**
 * Les deux formules de la page d'accueil, avec le choix mensuel / annuel. Seul le prix de
 * Premium change d'un mode à l'autre : le détail de ce que comprend chaque formule est dans
 * le tableau de comparaison, sous les cartes.
 */
export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const price = PREMIUM_PRICES[interval];

  return (
    <div className="mt-10">
      <div
        role="radiogroup"
        aria-label="Facturation"
        className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-1"
      >
        {(["monthly", "yearly"] as const).map((value) => {
          const selected = value === interval;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setInterval(value)}
              className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200 ${
                selected ? "bg-stone-900 text-stone-50" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {value === "monthly" ? "Mensuel" : "Annuel"}
              {value === "yearly" && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    selected ? "bg-accent-500 text-stone-50" : "bg-accent-50 text-accent-700"
                  }`}
                >
                  −33 %
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col rounded-[var(--radius-lg)] border border-stone-200 bg-stone-50 p-6 sm:p-8">
          <h3 className="text-sm font-medium tracking-wide text-stone-500 uppercase">Gratuit</h3>
          <p className="mt-4 flex items-baseline gap-2 text-stone-900">
            <span className="font-serif text-5xl tabular-nums">0 €</span>
            <span className="text-sm text-stone-500">pour toujours</span>
          </p>
          <p className="mt-1 h-5 text-sm text-stone-500">Sans carte bancaire.</p>
          <p className="mt-6 flex-1 text-sm leading-relaxed text-stone-600">
            Tout l&apos;essentiel pour suivre vos lectures au quotidien : ajout par scan, objectif,
            série, statistiques et bilan annuel.
          </p>
          <Link href="/register" className={buttonClasses("secondary", "mt-8 w-full")}>
            Créer un compte gratuit
          </Link>
        </div>

        <div className="noise-overlay relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-stone-900 p-6 text-stone-50 sm:p-8">
          <div className="relative flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-accent-200 text-sm font-medium tracking-wide uppercase">
                Premium
              </h3>
              <span className="rounded-full border border-stone-700 px-2.5 py-1 text-[11px] font-medium text-stone-300">
                {TRIAL_DAYS} jours offerts
              </span>
            </div>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="font-serif text-5xl tabular-nums">{price.perMonth}</span>
              <span className="text-sm text-stone-400">par mois</span>
            </p>
            <p className="mt-1 h-5 text-sm text-stone-400" aria-live="polite">
              {interval === "yearly"
                ? `Facturé ${PREMIUM_PRICES.yearly.amount} par an`
                : "Sans engagement, résiliable à tout moment"}
            </p>
            <p className="mt-6 flex-1 text-sm leading-relaxed text-stone-300">
              Pour les grands lecteurs : bibliothèque et citations illimitées, sagas complétées,
              pile triée selon vos goûts et statistiques avancées.
            </p>
            <Link
              href="/register"
              className="hover:bg-accent-100 mt-8 inline-flex w-full items-center justify-center rounded-[var(--radius-sm)] bg-stone-50 px-6 py-3 text-sm font-medium tracking-tight text-stone-900 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0"
            >
              Essayer gratuitement {TRIAL_DAYS} jours
            </Link>
            <p className="mt-3 text-center text-xs text-stone-400">
              Aucun prélèvement pendant l&apos;essai.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
