"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/**
 * Dimensions exactes de l'image « image not available » que Google sert à la place d'une
 * couverture absente à la résolution demandée. C'est toujours le même visuel redimensionné,
 * et son ratio (1,30) est trop banal pour le distinguer autrement : seules ses dimensions
 * exactes le trahissent.
 *
 * Un faux positif reste possible en théorie — une vraie couverture faisant précisément
 * 575×750 — mais il n'aurait pour effet que de revenir à la résolution d'origine, donc une
 * image moins fine, jamais une image manquante.
 */
const GOOGLE_PLACEHOLDER_SIZES: readonly (readonly [number, number])[] = [
  [300, 391],
  [575, 750],
  [800, 1043],
];

/**
 * Adapte l'URL d'une couverture à la taille où elle sera affichée.
 *
 * Google Books sert `zoom=1` par défaut, soit environ 128×197 pixels : nettement trop peu
 * pour une vignette de grille, et franchement flou sur un écran à forte densité. Les niveaux
 * supérieurs donnent 300×461 (zoom=2), 575×883 (zoom=3) et 800×1228 (zoom=4). On demande
 * donc la taille correspondant à l'affichage réel.
 *
 * `edge=curl` est retiré au passage : cet effet de page cornée déforme la couverture et
 * n'apporte rien.
 *
 * Open Library, lui, expose des suffixes de taille (-S, -M, -L) plutôt qu'un paramètre.
 */
function sizedCover(url: string, variant: "small" | "large"): string {
  if (url.includes("books.google")) {
    const base = url.replace(/&edge=curl/gi, "").replace(/([?&])zoom=\d+/i, "$1zoom=ZOOM");
    // zoom=2 rend 300×461, zoom=3 rend 575×883. Le second couvre une vignette de grille sur
    // écran à forte densité ; le premier suffit aux miniatures du tableau de bord.
    const level = variant === "large" ? 3 : 2;
    return base.includes("zoom=ZOOM")
      ? base.replace("zoom=ZOOM", `zoom=${level}`)
      : `${base}&zoom=${level}`;
  }

  if (url.includes("covers.openlibrary.org")) {
    return url.replace(/-[SML]\.jpg$/i, variant === "large" ? "-L.jpg" : "-M.jpg");
  }

  return url;
}

export function BookCover({
  coverUrl,
  alt,
  className,
  variant = "small",
  tactile = false,
}: BookCoverProps) {
  const [error, setError] = useState(!coverUrl);
  // Repli sur l'URL telle qu'elle a été enregistrée, quand la résolution supérieure
  // demandée à Google n'existe pas pour ce livre.
  const [useStoredUrl, setUseStoredUrl] = useState(false);
  const [lastCoverUrl, setLastCoverUrl] = useState(coverUrl);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Réinitialise l'état d'erreur quand la couverture change, en ajustant l'état pendant le
  // rendu (pattern recommandé par React) plutôt que dans un effet.
  if (coverUrl !== lastCoverUrl) {
    setLastCoverUrl(coverUrl);
    setError(!coverUrl);
    setUseStoredUrl(false);
  }

  /**
   * Google Books et Open Library ne renvoient pas de 404 quand une couverture manque : ils
   * servent une image de remplacement. Deux formes se rencontrent — un pixel minuscule, et
   * une bande « image not available » au ratio écrasé (0,16 contre environ 1,5 pour une
   * couverture). Dans le second cas, l'image existe bien à la résolution d'origine : on y
   * revient avant de renoncer.
   */
  const validateImage = useCallback(
    (img: HTMLImageElement) => {
      if (img.naturalWidth < 20 || img.naturalHeight < 20) {
        setError(true);
        return;
      }

      const ratio = img.naturalHeight / img.naturalWidth;
      const isPlaceholder = GOOGLE_PLACEHOLDER_SIZES.some(
        ([w, h]) => img.naturalWidth === w && img.naturalHeight === h,
      );

      // Ratio écrasé : image tronquée. Dimensions du substitut : couverture absente à cette
      // résolution. Dans les deux cas, la version d'origine est souvent la bonne.
      if (ratio < 0.9 || isPlaceholder) {
        if (useStoredUrl) setError(true);
        else setUseStoredUrl(true);
      }
    },
    [useStoredUrl],
  );

  // Une image déjà en cache peut être `complete` dès le montage, sans jamais déclencher
  // l'événement onLoad — d'où cet effet, le seul nécessaire ici.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) validateImage(img);
  }, [coverUrl, validateImage]);

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
  // On ne passe pas par `srcSet` en densité : le navigateur y divise `naturalWidth` par le
  // facteur de densité, ce qui rendrait indétectable le substitut de Google reconnu plus bas
  // à ses dimensions exactes.
  const src = useStoredUrl ? secureUrl : sizedCover(secureUrl, variant);

  return (
    // Les couvertures viennent d'hôtes tiers aux dimensions inconnues, et on les remplace
    // par une icône quand elles sont absentes ou trop petites : un <img> natif conserve
    // onLoad/onError et évite de faire transiter des images distantes par l'optimiseur.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
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
