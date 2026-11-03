"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "booklist-cookie-consent";

type ConsentState = "accepted" | "dismissed" | null;

// useSyncExternalStore plutôt qu'un useEffect : le bandeau ne doit pas apparaître puis
// disparaître au montage chez quelqu'un qui a déjà répondu.
function getServerSnapshot(): ConsentState {
  return null;
}

function getSnapshot(): ConsentState {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "dismissed" ? value : null;
  } catch {
    // Navigation privée ou stockage bloqué : on redemandera, sans casser la page.
    return null;
  }
}

function subscribe(onChange: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function setConsent(value: Exclude<ConsentState, null>) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Sans stockage, le choix ne survit pas au rechargement — le bandeau reviendra.
  }
  // L'événement `storage` natif ne se déclenche que dans les autres onglets : on l'émet
  // nous-mêmes pour que l'onglet courant se mette à jour immédiatement.
  window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY, newValue: value }));
}

export function useCookieConsent(): ConsentState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function CookieConsent() {
  const consent = useCookieConsent();

  const accept = useCallback(() => setConsent("accepted"), []);

  if (consent) return null;

  // Une seule ligne et un « OK » discret (contour) : BookList n'utilise que des cookies
  // essentiels, il n'y a rien à accepter ni à refuser. Un bandeau plein écran avec un gros
  // bouton noir masquait l'inscription sur mobile et passait pour l'action principale.
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Information sur les cookies"
      className="bg-card fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(36,29,21,0.3)] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:rounded-[var(--radius-sm)] sm:border sm:pb-2.5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-snug text-stone-600 sm:text-sm">
          Cookies essentiels uniquement.{" "}
          <Link href="/legal/cookies" className="link whitespace-nowrap">
            En savoir plus
          </Link>
        </p>
        <Button
          variant="secondary"
          onClick={accept}
          className="shrink-0 px-4! py-1.5! text-xs sm:text-sm"
        >
          OK
        </Button>
      </div>
    </div>
  );
}
