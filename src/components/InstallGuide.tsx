"use client"

import { useEffect, useState } from "react"

type Platform = "ios" | "android" | "desktop"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "android"
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return "ios"
  if (/Android/.test(ua)) return "android"
  return "desktop"
}

export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>("android")
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    setPlatform(detectPlatform())

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsInstalled(isStandalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const tabs: { key: Platform; label: string }[] = [
    { key: "ios", label: "iPhone / iPad" },
    { key: "android", label: "Android" },
    { key: "desktop", label: "Ordinateur" },
  ]

  if (isInstalled) {
    return (
      <div className="card p-5 text-center sm:p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckIcon className="h-6 w-6" />
        </div>
        <p className="mt-3 font-medium text-stone-900">BookList est déjà installée</p>
        <p className="mt-1 text-sm text-stone-500">
          Vous utilisez actuellement l&apos;application installée sur votre appareil.
        </p>
      </div>
    )
  }

  return (
    <div>
      {deferredPrompt && (
        <div className="card mb-4 p-5 sm:p-6">
          <p className="text-sm font-medium text-stone-900">Installation rapide disponible</p>
          <p className="mt-1 text-sm text-stone-500">
            Votre navigateur peut installer BookList en un clic.
          </p>
          <button onClick={handleInstallClick} className="btn-primary mt-4 w-full">
            Installer maintenant
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-1 rounded-lg bg-stone-100 p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPlatform(tab.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              platform === tab.key
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card p-5 sm:p-6">
        {platform === "ios" && (
          <ol className="space-y-4">
            <Step number={1}>
              Ouvrez BookList dans <strong>Safari</strong> (l&apos;installation ne fonctionne pas depuis
              Chrome ou une autre app sur iOS).
            </Step>
            <Step number={2}>
              Appuyez sur l&apos;icône de <strong>partage</strong>{" "}
              <ShareIcon className="inline h-4 w-4 -mt-0.5" /> en bas de l&apos;écran.
            </Step>
            <Step number={3}>
              Faites défiler puis appuyez sur <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
            </Step>
            <Step number={4}>
              Appuyez sur <strong>« Ajouter »</strong> en haut à droite. L&apos;icône BookList apparaît
              sur votre écran d&apos;accueil.
            </Step>
          </ol>
        )}

        {platform === "android" && (
          <ol className="space-y-4">
            <Step number={1}>
              Ouvrez BookList dans <strong>Chrome</strong>.
            </Step>
            <Step number={2}>
              Appuyez sur le menu <strong>⋮</strong> en haut à droite.
            </Step>
            <Step number={3}>
              Sélectionnez <strong>« Installer l&apos;application »</strong> ou{" "}
              <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong>.
            </Step>
            <Step number={4}>
              Confirmez : BookList s&apos;ouvrira alors comme une application native.
            </Step>
          </ol>
        )}

        {platform === "desktop" && (
          <ol className="space-y-4">
            <Step number={1}>
              Ouvrez BookList dans <strong>Chrome</strong> ou <strong>Edge</strong>.
            </Step>
            <Step number={2}>
              Cliquez sur l&apos;icône d&apos;installation{" "}
              <DownloadIcon className="inline h-4 w-4 -mt-0.5" /> dans la barre d&apos;adresse (à droite).
            </Step>
            <Step number={3}>
              Cliquez sur <strong>« Installer »</strong> dans la fenêtre qui apparaît.
            </Step>
          </ol>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-stone-400">
        Une fois installée, l&apos;application fonctionne aussi hors connexion pour consulter vos livres.
      </p>
    </div>
  )
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-medium text-white">
        {number}
      </span>
      <p className="text-sm leading-relaxed text-stone-600">{children}</p>
    </li>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6-3l3-3m0 0l3 3m-3-3v11.25" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
