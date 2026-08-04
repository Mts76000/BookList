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
  const [error, setError] = useState<string>("")
  const [isStarting, setIsStarting] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("La caméra n'est pas disponible sur cet appareil ou ce navigateur.")
      setIsStarting(false)
      return
    }

    // Codes-barres livres = EAN-13 (parfois UPC-A). On restreint pour plus de fiabilité/vitesse.
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
    ])

    const reader = new BrowserMultiFormatReader(hints)

    reader
      .decodeFromConstraints(
        {
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        },
        videoRef.current!,
        (result, err) => {
          if (cancelled) return
          setIsStarting(false)
          if (result) {
            const text = result.getText()
            // Vibration légère si supportée pour confirmer le scan
            if (navigator.vibrate) navigator.vibrate(80)
            controlsRef.current?.stop()
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
        controlsRef.current = controls
      })
      .catch((err) => {
        if (cancelled) return
        setIsStarting(false)
        if (err?.name === "NotAllowedError") {
          setError("Accès à la caméra refusé. Autorisez la caméra dans les paramètres de votre navigateur.")
        } else if (err?.name === "NotFoundError") {
          setError("Aucune caméra détectée sur cet appareil.")
        } else {
          setError("Impossible de démarrer la caméra.")
        }
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">Scanner un code-barres</p>
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

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />

        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}

        {isStarting && !error && (
          <div className="absolute inset-x-0 top-1/2 mt-24 text-center text-sm text-white/80">
            Démarrage de la caméra...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-6">
            <div className="max-w-xs text-center">
              <p className="text-sm text-white/90">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-stone-900"
              >
                Fermer
              </button>
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
