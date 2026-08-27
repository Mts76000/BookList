"use client";

import { useEffect } from "react";

/**
 * Le service worker est désactivé en développement, mais un précédent
 * `npm run build && npm start` peut en avoir laissé un enregistré dans le navigateur. Il
 * sert alors du JavaScript périmé et provoque des erreurs d'hydratation sans aucun rapport
 * avec le code en cours d'écriture. On le désinscrit, et on vide ses caches, au démarrage
 * en dev pour éviter des heures de débogage sur un faux problème.
 */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    if (window.caches) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  }, []);

  return null;
}
