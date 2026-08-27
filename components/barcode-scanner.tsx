"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

interface BarcodeScannerProps {
  onDetected: (isbn: string) => void;
  onClose: () => void;
}

// Codes-barres de livres : EAN-13 le plus souvent, mais certaines éditions utilisent
// EAN-8, UPC ou Code 128.
const ACCEPTED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

/** Au-delà, on considère que le flux ne démarrera pas et on propose de réessayer. */
const STUCK_TIMEOUT_MS = 8000;

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError") {
    return "Accès à la caméra refusé. Autorisez la caméra dans les paramètres de votre navigateur.";
  }
  if (name === "NotFoundError") return "Aucune caméra détectée sur cet appareil.";
  if (name === "NotReadableError") {
    return "La caméra est déjà utilisée par une autre application. Fermez-la puis réessayez.";
  }
  return "Impossible de démarrer la caméra.";
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasDecodedRef = useRef(false);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let controls: IScannerControls | null = null;
    hasDecodedRef.current = false;

    // navigator.mediaDevices n'existe que côté client : la vérification ne peut pas
    // sortir de l'effet.
    if (!navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("La caméra n'est pas disponible sur cet appareil ou ce navigateur.");
      setIsStarting(false);
      return;
    }

    // Écran resté noir ou figé : plutôt que de laisser l'utilisateur attendre
    // indéfiniment, on lui propose de relancer.
    const stuckTimeout = setTimeout(() => {
      if (cancelled || hasDecodedRef.current) return;
      setIsStarting(false);
      setError(
        "L'image de la caméra ne s'affiche pas. Vérifiez qu'aucune autre application ne l'utilise, puis réessayez.",
      );
    }, STUCK_TIMEOUT_MS);

    // ZXing journalise à chaque image sans code détecté — le fonctionnement normal du scan
    // continu — et lors des remontages rapides de la vidéo. On tait ce bruit connu le temps
    // du scan, sinon la console devient inexploitable.
    const originalWarn = console.warn;
    const originalError = console.error;
    const isKnownZxingNoise = (args: unknown[]) =>
      typeof args[0] === "string" &&
      (args[0].includes("non-ReaderException") ||
        args[0].includes("Trying to play video") ||
        args[0].includes("possible to play the video") ||
        args[0].includes("interrupted by new loading request"));

    console.warn = (...args: unknown[]) => {
      if (!isKnownZxingNoise(args)) originalWarn(...args);
    };
    console.error = (...args: unknown[]) => {
      if (!isKnownZxingNoise(args)) originalError(...args);
    };

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ACCEPTED_FORMATS);
    // TRY_HARDER : plus lent, mais bien plus fiable sur un code flou, petit ou mal éclairé.
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);

    // Démarrage différé pour neutraliser le double montage du Strict Mode en dev : sans ce
    // délai, deux flux caméra sont attachés au même <video>, et le nettoyage du premier
    // remet srcObject à null, ce qui coupe le second — écran noir définitif.
    const startTimer = setTimeout(() => {
      if (cancelled || !videoRef.current) return;

      reader
        .decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              // Flux en portrait : c'est ainsi qu'on tient un téléphone face au dos
              // d'un livre.
              width: { ideal: 1080 },
              height: { ideal: 1920 },
              aspectRatio: { ideal: 9 / 16 },
            },
            audio: false,
          },
          videoRef.current,
          (result) => {
            if (cancelled) return;
            // Le premier appel du callback, même sans résultat, prouve que le flux tourne.
            hasDecodedRef.current = true;
            setIsStarting(false);
            if (result && ACCEPTED_FORMATS.includes(result.getBarcodeFormat())) {
              // Vibration courte : le scan aboutit souvent hors du champ de vision.
              navigator.vibrate?.(80);
              controls?.stop();
              onDetected(result.getText());
            }
          },
        )
        .then((scannerControls) => {
          if (cancelled) {
            scannerControls.stop();
            return;
          }
          controls = scannerControls;
        })
        .catch((err) => {
          if (cancelled) return;
          setIsStarting(false);
          setError(cameraErrorMessage(err));
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(stuckTimeout);
      controls?.stop();
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [onDetected, retryKey]);

  // Le flux est parfois livré en paysage alors que le téléphone est tenu en portrait :
  // on compense avec l'angle rapporté par screen.orientation.
  useEffect(() => {
    const applyOrientation = () => {
      const angle = screen.orientation?.angle ?? 0;
      setRotation(angle === 90 || angle === 270 ? angle : 0);
    };

    applyOrientation();
    screen.orientation?.addEventListener("change", applyOrientation);
    return () => screen.orientation?.removeEventListener("change", applyOrientation);
  }, []);

  const handleRetry = useCallback(() => {
    setError("");
    setIsStarting(true);
    setRetryKey((key) => key + 1);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">Scanner un code-barres</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Pivoter l'image"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Fermer le scanner"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
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
              {/* Un ISBN en EAN-13 est toujours horizontal : le cadre doit être large et
                  bas, jamais haut et étroit. */}
              <div className="h-24 w-72 rounded-[var(--radius-sm)] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] sm:h-28 sm:w-80" />
            </div>
          )}
        </div>

        {isStarting && !error && (
          <div className="absolute inset-x-0 top-1/2 mt-24 text-center text-sm text-white/80">
            Démarrage de la caméra…
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-6">
            <div className="max-w-xs text-center">
              <p className="text-sm text-white/90">{error}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-[var(--radius-sm)] bg-white px-4 py-2 text-sm font-medium text-stone-900"
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[var(--radius-sm)] border border-white/30 px-4 py-2 text-sm font-medium text-white"
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
  );
}
