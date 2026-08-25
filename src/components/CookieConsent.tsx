"use client"

import { useCallback, useSyncExternalStore } from "react"

const CONSENT_KEY = "booklist-cookie-consent"

type ConsentState = "accepted" | "dismissed" | null

function getServerSnapshot(): ConsentState {
  return null
}

function getSnapshot(): ConsentState {
  if (typeof window === "undefined") return null
  const value = localStorage.getItem(CONSENT_KEY)
  return value === "accepted" || value === "dismissed" ? (value as ConsentState) : null
}

function subscribe(onChange: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) onChange()
  }
  window.addEventListener("storage", handler)
  return () => window.removeEventListener("storage", handler)
}

function setConsent(value: ConsentState) {
  if (value) {
    localStorage.setItem(CONSENT_KEY, value)
  } else {
    localStorage.removeItem(CONSENT_KEY)
  }
  window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY, newValue: value }))
}

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const accept = useCallback(() => setConsent("accepted"), [])
  const dismiss = useCallback(() => setConsent("dismissed"), [])

  if (consent) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-(--surface) p-4 shadow-[0_-8px_32px_-12px_rgba(36,29,21,0.25)] sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-[--radius-md] sm:border"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-stone-600">
          BookList utilise uniquement des cookies essentiels pour l&apos;authentification et le
          fonctionnement de l&apos;application. Aucun cookie publicitaire ou de suivi.{" "}
          <a href="/politique-cookies" className="btn-text">
            En savoir plus
          </a>
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={dismiss}
            className="text-sm font-medium text-stone-500 transition hover:text-stone-900"
          >
            Refuser
          </button>
          <button onClick={accept} className="btn-primary text-sm">
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
