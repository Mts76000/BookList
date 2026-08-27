"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  subscribeToPwaInstallPrompt,
  getPwaInstallPrompt,
  getPwaInstallPromptServerSnapshot,
  subscribeToDisplayMode,
  getIsStandalone,
  getIsStandaloneServerSnapshot,
  triggerPwaInstall,
} from "@/lib/pwa-install-store";

const DISMISSED_KEY = "pwa-install-prompt-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Site-wide install banner, opt-in per project via NEXT_PUBLIC_PWA_INSTALL_PROMPT_ENABLED
 * (see .env.example) — many projects built from this starter don't want an unprompted popup.
 * Only ever appears where the browser actually offers a native install (Chromium); iOS Safari
 * has no such event, so it stays silent there rather than nagging with instructions.
 */
export function PwaInstallPrompt() {
  const enabled = process.env.NEXT_PUBLIC_PWA_INSTALL_PROMPT_ENABLED === "true";
  const deferredPrompt = useSyncExternalStore(
    subscribeToPwaInstallPrompt,
    getPwaInstallPrompt,
    getPwaInstallPromptServerSnapshot,
  );
  const isStandalone = useSyncExternalStore(
    subscribeToDisplayMode,
    getIsStandalone,
    getIsStandaloneServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(readDismissed);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Best-effort only — worst case the banner reappears next visit.
    }
  }

  async function handleInstall() {
    await triggerPwaInstall();
    handleDismiss();
  }

  if (!enabled || isStandalone || dismissed || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      className="border-border bg-card fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <div className="flex-1 text-sm">
        <p className="text-card-foreground font-medium">Installer l&apos;application</p>
        <p className="text-muted-foreground mt-0.5">
          Accès rapide depuis votre écran d&apos;accueil.
        </p>
      </div>
      <Button type="button" onClick={handleInstall} className="shrink-0">
        Installer
      </Button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer"
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
