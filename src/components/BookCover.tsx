"use client"

import { useEffect, useState } from "react"

interface BookCoverProps {
  coverUrl?: string | null
  alt?: string
  className?: string
}

export function BookCover({ coverUrl, alt, className }: BookCoverProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(() =>
    coverUrl ? "loading" : "error"
  )

  useEffect(() => {
    setStatus(coverUrl ? "loading" : "error")
  }, [coverUrl])

  if (!coverUrl || status === "error") {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-stone-100 text-stone-300 ${className ?? ""}`}
      >
        <BookIcon className="h-8 w-8" />
      </div>
    )
  }

  const secureUrl = coverUrl.replace(/^http:/, "https:")

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {status === "loading" && (
        <div className="absolute inset-0 z-10 animate-pulse bg-stone-200" />
      )}
      <img
        src={secureUrl}
        alt={alt ?? ""}
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          status === "loaded" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
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
