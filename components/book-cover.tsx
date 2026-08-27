"use client";

import { useEffect, useRef, useState } from "react";

interface BookCoverProps {
  coverUrl?: string | null;
  alt?: string;
  className?: string;
  variant?: "small" | "large";
  /** Ombre « physique » et légère réaction au survol, façon livre posé sur l'étagère. */
  tactile?: boolean;
}

// Les micro-interactions sont en CSS et non via une bibliothèque d'animation : un décalage,
// une rotation et une mise à l'échelle au survol ne justifient pas une dépendance de plus.
const TACTILE_CLASSES =
  "transition-transform duration-300 ease-out hover:-translate-y-1 hover:-rotate-[0.75deg] active:scale-[0.97] motion-reduce:transform-none";

const TACTILE_SHADOW =
  "shadow-[0_2px_2px_rgba(36,29,21,0.08),0_18px_28px_-14px_rgba(36,29,21,0.4)]";

export function BookCover({
  coverUrl,
  alt,
  className,
  variant = "small",
  tactile = false,
}: BookCoverProps) {
  const [error, setError] = useState(!coverUrl);
  const [lastCoverUrl, setLastCoverUrl] = useState(coverUrl);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Réinitialise l'état d'erreur quand la couverture change, en ajustant l'état pendant le
  // rendu (pattern recommandé par React) plutôt que dans un effet.
  if (coverUrl !== lastCoverUrl) {
    setLastCoverUrl(coverUrl);
    setError(!coverUrl);
  }

  // Google Books et Open Library renvoient parfois un pixel de remplacement au lieu d'un
  // 404 : une image minuscule est traitée comme une couverture manquante.
  const validateImage = (img: HTMLImageElement) => {
    if (img.naturalWidth < 20 || img.naturalHeight < 20) {
      setError(true);
    }
  };

  // Une image déjà en cache peut être `complete` dès le montage, sans jamais déclencher
  // l'événement onLoad — d'où cet effet, le seul nécessaire ici.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) validateImage(img);
  }, [coverUrl]);

  const interactionClasses = tactile ? `${TACTILE_CLASSES} ${TACTILE_SHADOW}` : "";

  if (error || !coverUrl) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-stone-100 text-stone-400 ${interactionClasses} ${className ?? ""}`}
      >
        <BookIcon className="h-10 w-10" />
      </div>
    );
  }

  const secureUrl = coverUrl.replace(/^http:/, "https:");
  const isOpenLibrary = secureUrl.includes("covers.openlibrary.org");
  // Vignette moyenne dans les listes : la version -L pèse plusieurs fois plus lourd pour
  // une taille d'affichage identique.
  const sizedUrl =
    variant === "small" && isOpenLibrary ? secureUrl.replace(/-L\.jpg$/i, "-M.jpg") : secureUrl;

  return (
    // Les couvertures viennent d'hôtes tiers aux dimensions inconnues, et on les remplace
    // par une icône quand elles sont absentes ou trop petites : un <img> natif conserve
    // onLoad/onError et évite de faire transiter des images distantes par l'optimiseur.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={sizedUrl}
      alt={alt ?? ""}
      loading={variant === "large" ? "eager" : "lazy"}
      decoding="async"
      onLoad={(e) => validateImage(e.currentTarget)}
      onError={() => setError(true)}
      className={`object-cover ${interactionClasses} ${className ?? ""}`}
    />
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}
