"use client"

import { useEffect } from "react"

/**
 * En développement, next-pwa désactive le service worker, mais un précédent
 * `npm run build && npm start` (mode production) peut en avoir enregistré un
 * dans le navigateur. Ce SW sert alors du JS obsolète et provoque des erreurs
 * d'hydratation qui n'ont rien à voir avec le code actuel. On le désinscrit
 * automatiquement en dev pour éviter toute confusion.
 */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })

    if (window.caches) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key))
      })
    }
  }, [])

  return null
}
