"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library"

interface BarcodeScannerProps {
  onDetected: (isbn: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const hasDecodedRef = useRef(false)
  const [error, setError] = useState<string>("")
  const [isStarting, setIsStarting] = useState(true)
  const [retryKey, setRetryKey] = useState(0)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let cancelled = false
    let localControls: IScannerControls | null = null
    hasDecodedRef.current = false

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("La caméra n'est pas disponible sur cet appareil ou ce navigateur.")
      setIsStarting(false)
      return
    }

    // Si aucune frame n'est jamais décodée (écran resté noir/figé), on propose de
    // réessayer plutôt que de laisser l'utilisateur bloqué indéfiniment.
    const stuckTimeout = setTimeout(() => {
      if (!cancelled && !hasDecodedRef.current) {
        setIsStarting(false)
        setError(
          "L'image de la caméra ne s'affiche pas. Vérifiez qu'aucune autre application ne l'utilise, puis réessayez."
        )
      }
    }, 8000)

    // ZXing logue un warning/error à chaque frame sans code détecté (comportement
    // normal du scan continu) ainsi que lors du remount rapide de la vidéo.
    // On filtre ce bruit connu et inoffensif pendant que le scanner est actif.
    const originalWarn = console.warn
    const originalError = console.error
    const isKnownZxingNoise = (args: unknown[]) =>
      typeof args[0] === "string" &&
      (args[0].includes("non-ReaderException") ||
        args[0].includes("Trying to play video") ||
        args[0].includes("possible to play the video") ||
        args[0].includes("interrupted by new loading request"))

    console.warn = (...args: unknown[]) => {
      if (isKnownZxingNoise(args)) return
      originalWarn(...args)
    }
    console.error = (...args: unknown[]) => {
      if (isKnownZxingNoise(args)) return
      originalError(...args)
    }

    // Codes-barres livres = EAN-13 (parfois EAN-8/UPC/Code128 selon l'édition).
    // On accepte ces formats et on active TRY_HARDER pour une meilleure lecture
    // sur des codes flous, petits ou mal éclairés (plus lent mais plus fiable).
    const acceptedFormats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, acceptedFormats)
    hints.set(DecodeHintType.TRY_HARDER, true)

    const reader = new BrowserMultiFormatReader(hints)

    // IMPORTANT : démarrage différé pour neutraliser le double montage de
    // React Strict Mode en dev. Sans ce délai, deux flux caméra concurrents
    // sont attachés au même <video> et le nettoyage du premier peut couper
    // le second (srcObject remis à null) => écran noir permanent.
    const startTimer = setTimeout(() => {
      if (cancelled || !videoRef.current) return

      reader
        .decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              // Flux en mode portrait : plus haut que large, plus naturel pour
              // un smartphone tenu verticalement et pour un code-barres horizontal
              // au dos d'un livre.
              width: { ideal: 1080 },
              height: { ideal: 1920 },
              aspectRatio: { ideal: 9 / 16 },
            },
            audio: false,
          },
          videoRef.current,
          (result, err) => {
            if (cancelled) return
            hasDecodedRef.current = true
            setIsStarting(false)
            if (result && acceptedFormats.includes(result.getBarcodeFormat())) {
              const text = result.getText()
              // Vibration légère si supportée pour confirmer le scan
              if (navigator.vibrate) navigator.vibrate(80)
              localControls?.stop()
              onDetected(text)
            } else if (err && !(err instanceof NotFoundException)) {
              // Erreurs de décodage "normales" (NotFoundException) sont ignorées, ce sont juste des frames sans code
            }
          }
        )
        .then((controls) => {
          if (cancelled) {
            controls.stop()
            return
          }
          localControls = controls
          controlsRef.current = controls
        })
        .catch((err) => {
          if (cancelled) return
          setIsStarting(false)
          if (err?.name === "NotAllowedError") {
            setError("Accès à la caméra refusé. Autorisez la caméra dans les paramètres de votre navigateur.")
          } else if (err?.name === "NotFoundError") {
            setError("Aucune caméra détectée sur cet appareil.")
          } else if (err?.name === "NotReadableError") {
            setError("La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez.")
          } else {
            setError("Impossible de démarrer la caméra.")
          }
        })
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(startTimer)
      clearTimeout(stuckTimeout)
      localControls?.stop()
      console.warn = originalWarn
      console.error = originalError
    }
  }, [onDetected, retryKey])

  const handleRetry = () => {
    setError("")
    setIsStarting(true)
    setRetryKey((key) => key + 1)
  }

  // Rotation automatique selon l'orientation du téléphone (iOS Safari ou autre).
  // Si le flux caméra est livré en paysage alors que le téléphone est tenu
  // en portrait, l'image se retourne automatiquement pour correspondre.
  useEffect(() => {
    const applyOrientation = () => {
      const angle =
        typeof window !== "undefined" && "orientation" in window
          ? (window as Window & { orientation: number }).orientation
          : 0
      setRotation(angle === 90 ? 90 : angle === -90 || angle === 270 ? 270 : 0)
    }

    applyOrientation()
    window.addEventListener("orientationchange", applyOrientation)
    return () => window.removeEventListener("orientationchange", applyOrientation)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">Scanner un code-barres</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Pivoter l'image"
            title="Pivoter"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Fermer le scanner"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          className="h-full w-full transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <video
            key={retryKey}
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {!error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-72 w-32 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          )}
        </div>

        {isStarting && !error && (
          <div className="absolute inset-x-0 top-1/2 mt-24 text-center text-sm text-white/80">
            Démarrage de la caméra...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-6">
            <div className="max-w-xs text-center">
              <p className="text-sm text-white/90">{error}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={handleRetry}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-stone-900"
                >
                  Réessayer
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium text-white"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!error && (
        <p className="px-6 py-4 text-center text-xs text-white/70">
          Placez le code-barres ISBN (au dos du livre) dans le cadre
        </p>
      )}
    </div>
  )
}
