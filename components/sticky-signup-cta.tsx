"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCookieConsent } from "@/components/cookie-consent";
import { buttonClasses } from "@/components/ui/button";

/**
 * Bouton d'inscription collé en bas de l'écran, sur mobile uniquement. Il apparaît une fois
 * le bouton du haut de page dépassé et s'efface quand l'appel final (`finalId`) est à
 * l'écran, pour ne jamais doubler un bouton déjà visible.
 */
export function StickySignupCta({ heroId, finalId }: { heroId: string; finalId: string }) {
  const [pastHero, setPastHero] = useState(false);
  const [finalVisible, setFinalVisible] = useState(false);
  // Comme la proposition d'installation : pas deux éléments empilés sur le bandeau cookies.
  const cookieConsent = useCookieConsent();

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const final = document.getElementById(finalId);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) {
          setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        } else if (entry.target === final) {
          setFinalVisible(entry.isIntersecting);
        }
      }
    });
    if (hero) observer.observe(hero);
    if (final) observer.observe(final);
    return () => observer.disconnect();
  }, [heroId, finalId]);

  const visible = Boolean(cookieConsent) && pastHero && !finalVisible;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-stone-50/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 ease-out sm:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <Link
        href="/register"
        tabIndex={visible ? undefined : -1}
        className={buttonClasses("primary", "w-full")}
      >
        Créer mon compte gratuit
      </Link>
    </div>
  );
}
