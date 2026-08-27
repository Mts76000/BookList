"use client";

import { useEffect } from "react";

/** Registers public/sw.js — required for Chrome to fire `beforeinstallprompt` (see pwa-install-prompt.tsx). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
