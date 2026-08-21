"use client"

import { useEffect, useRef, useState } from "react"

interface BookCoverProps {
  coverUrl?: string | null
  alt?: string
  className?: string
  variant?: "small" | "large"
}

export function BookCover({
  coverUrl,
  alt,
  className,
  variant = "small",
}: BookCoverProps) {
  const [error, setError] = useState(!coverUrl)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const validateImage = (img: HTMLImageElement) => {
    if (img.naturalWidth < 20 || img.naturalHeight < 20) {
      setError(true)
    }
  }

  useEffect(() => {
    setError(!coverUrl)
    const img = imgRef.current
    if (img && img.complete) {
      validateImage(img)
    }
  }, [coverUrl])

  if (error || !coverUrl) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-stone-100 text-stone-500 ${className ?? ""}`}
      >
        <BookIcon className="h-10 w-10" />
      </div>
    )
  }

  const secureUrl = coverUrl.replace(/^http:/, "https:")
  const isOpenLibrary = secureUrl.includes("covers.openlibrary.org")
  const sizedUrl =
    variant === "small" && isOpenLibrary
      ? secureUrl.replace(/-L\.jpg$/i, "-M.jpg")
      : secureUrl

  return (
    <img
      ref={imgRef}
      src={sizedUrl}
      alt={alt ?? ""}
      loading={variant === "large" ? "eager" : "lazy"}
      decoding="async"
      onLoad={(e) => validateImage(e.currentTarget as HTMLImageElement)}
      onError={() => setError(true)}
      className={`object-cover ${className ?? ""}`}
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
