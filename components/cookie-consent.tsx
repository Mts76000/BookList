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

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const accept = useCallback(() => setConsent("accepted"), []);
  const dismiss = useCallback(() => setConsent("dismissed"), []);

  if (consent) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Information sur les cookies"
      className="bg-card fixed right-0 bottom-0 left-0 z-50 border-t border-stone-200 p-4 shadow-[0_-8px_32px_-12px_rgba(36,29,21,0.25)] sm:right-4 sm:bottom-4 sm:left-4 sm:rounded-[var(--radius-md)] sm:border"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-stone-600">
          BookList utilise uniquement des cookies essentiels pour l&apos;authentification et le
          fonctionnement de l&apos;application. Aucun cookie publicitaire ou de suivi.{" "}
          <Link href="/legal/cookies" className="link">
            En savoir plus
          </Link>
        </p>
        <div className="flex items-center gap-3">
          <Button variant="text" onClick={dismiss}>
            Refuser
          </Button>
          <Button onClick={accept}>Accepter</Button>
        </div>
      </div>
    </div>
  );
}
