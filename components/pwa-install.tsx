"use client";

import { useSyncExternalStore } from "react";
import { AndroidLogo, AppleLogo, Monitor, Share, DotsThreeVertical } from "@phosphor-icons/react";
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

const STEPS = [
  {
    icon: AppleLogo,
    platform: "iPhone / iPad",
    instruction: "Safari",
    detail: "Appuyez sur",
    action: Share,
    tail: "puis « Sur l'écran d'accueil ».",
  },
  {
    icon: AndroidLogo,
    platform: "Android",
    instruction: "Chrome",
    detail: "Ouvrez le menu",
    action: DotsThreeVertical,
    tail: "puis « Installer l'application ».",
  },
  {
    icon: Monitor,
    platform: "Ordinateur",
    instruction: "Chrome / Edge",
    detail: "Cliquez sur l'icône d'installation dans la barre d'adresse.",
    action: null,
    tail: "",
  },
] as const;

/**
 * `beforeinstallprompt` only fires on Chromium (Android/desktop) and only once the browser
 * decides the PWA is installable. Safari (iOS/macOS) never fires it — there's no programmatic
 * install API there, so we fall back to written instructions for the manual share-sheet flow.
 */
export function PwaInstallSection() {
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

  if (isStandalone) {
    return (
      <p className="text-muted-foreground text-sm">
        L&apos;application est déjà installée sur cet appareil.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {deferredPrompt ? (
        <Button type="button" onClick={() => triggerPwaInstall()} className="self-start">
          Installer l&apos;application
        </Button>
      ) : null}

      <ul className="divide-border -mx-2 flex flex-col divide-y">
        {STEPS.map(
          ({ icon: PlatformIcon, platform, instruction, detail, action: ActionIcon, tail }) => (
            <li key={platform} className="flex items-start gap-3 px-2 py-3">
              <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <PlatformIcon size={18} aria-hidden="true" />
              </span>
              <div className="text-sm">
                <p className="text-card-foreground font-medium">
                  {platform}{" "}
                  <span className="text-muted-foreground font-normal">· {instruction}</span>
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {detail}
                  {ActionIcon ? (
                    <ActionIcon
                      size={14}
                      weight="bold"
                      aria-hidden="true"
                      className="mx-1 inline-block align-text-bottom"
                    />
                  ) : null}
                  {tail}
                </p>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
