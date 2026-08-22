"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"

interface BookCoverProps {
  coverUrl?: string | null
  alt?: string
  className?: string
  variant?: "small" | "large"
  /** Ajoute une ombre "physique" et une légère réaction au survol/à l'appui, façon livre posé sur l'étagère. */
  tactile?: boolean
}

export function BookCover({
  coverUrl,
  alt,
  className,
  variant = "small",
  tactile = false,
}: BookCoverProps) {
  const [error, setError] = useState(!coverUrl)
  const [lastCoverUrl, setLastCoverUrl] = useState(coverUrl)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Réinitialise l'état d'erreur quand la couverture change, en ajustant l'état
  // pendant le rendu (pattern recommandé par React) plutôt que dans un effet.
  if (coverUrl !== lastCoverUrl) {
    setLastCoverUrl(coverUrl)
    setError(!coverUrl)
  }

  const validateImage = (img: HTMLImageElement) => {
    if (img.naturalWidth < 20 || img.naturalHeight < 20) {
      setError(true)
    }
  }

  // Cas restant nécessitant un effet : une image déjà en cache navigateur peut être
  // `complete` dès le montage, sans jamais déclencher l'événement `onLoad` du <img>.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete) {
      validateImage(img)
    }
  }, [coverUrl])

  const tactileProps = tactile
    ? {
        whileHover: { y: -4, rotate: -0.75, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
        whileTap: { scale: 0.97 },
      }
    : {}

  const shadowClass = tactile
    ? "shadow-[0_2px_2px_rgba(36,29,21,0.08),0_18px_28px_-14px_rgba(36,29,21,0.4)]"
    : ""

  if (error || !coverUrl) {
    return (
      <motion.div
        {...tactileProps}
        className={`relative flex items-center justify-center overflow-hidden bg-stone-100 text-stone-400 ${shadowClass} ${className ?? ""}`}
      >
        <BookIcon className="h-10 w-10" />
      </motion.div>
    )
  }

  const secureUrl = coverUrl.replace(/^http:/, "https:")
  const isOpenLibrary = secureUrl.includes("covers.openlibrary.org")
  const sizedUrl =
    variant === "small" && isOpenLibrary
      ? secureUrl.replace(/-L\.jpg$/i, "-M.jpg")
      : secureUrl

  return (
    <motion.img
      {...tactileProps}
      ref={imgRef}
      src={sizedUrl}
      alt={alt ?? ""}
      loading={variant === "large" ? "eager" : "lazy"}
      decoding="async"
      onLoad={(e) => validateImage(e.currentTarget as HTMLImageElement)}
      onError={() => setError(true)}
      className={`object-cover ${shadowClass} ${className ?? ""}`}
    />
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  )
}
