"use client";

import { useState } from "react";
import Link from "next/link";
import { DownloadSimple, LockSimple, ShareNetwork } from "@phosphor-icons/react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { REVIEW_THEMES, type ReviewThemeId } from "@/lib/review-themes";
import { shareOrDownloadImage } from "@/lib/share-image";

interface YearReviewShareProps {
  year: number;
  isPremium: boolean;
  /**
   * Coup de cœur affiché : il entre dans l'adresse de l'image pour que l'aperçu se régénère
   * quand il change, au lieu de resservir l'image déjà chargée.
   */
  favoriteId: string | null;
}

const THEME_IDS = Object.keys(REVIEW_THEMES) as ReviewThemeId[];

/**
 * Aperçu de l'image du bilan, choix du style et partage. Sur mobile, le partage natif
 * envoie l'image directement dans une story ou une conversation ; ailleurs, elle se
 * télécharge.
 */
export function YearReviewShare({ year, isPremium, favoriteId }: YearReviewShareProps) {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ReviewThemeId>("classique");
  // Adresse de la dernière image chargée : l'aperçu repasse en chargement dès que l'adresse
  // change (style ou coup de cœur), au lieu de laisser l'ancienne image affichée sans signe
  // de régénération.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Un style Premium sans abonnement s'affiche en aperçu filigrané, sans partage possible.
  const isLockedTheme = REVIEW_THEMES[theme].premium && !isPremium;
  const imageUrl = `/api/year-review/image?year=${year}&theme=${theme}&favorite=${favoriteId ?? ""}${isLockedTheme ? "&preview=1" : ""}`;
  const isLoaded = loadedUrl === imageUrl;
  const fileName = `bilan-lecture-${year}.png`;

  async function handleShare(mode: "share" | "download") {
    setIsSharing(mode === "share");
    const ok = await shareOrDownloadImage(imageUrl, fileName, `Mon année de lecture ${year}`, mode);
    setIsSharing(false);
    if (!ok) toast("Impossible de générer l'image. Réessayez.", "error");
  }

  function selectTheme(id: ReviewThemeId) {
    if (id === theme) return;
    setTheme(id);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-[var(--radius-lg)] bg-stone-100 shadow-[0_2px_2px_rgba(36,29,21,0.08),0_30px_50px_-24px_rgba(36,29,21,0.5)]">
        {!isLoaded && <div className="absolute inset-0 animate-pulse bg-stone-200/60" />}
        {/* eslint-disable-next-line @next/next/no-img-element -- image générée à la volée, privée, non optimisable par next/image */}
        <img
          key={imageUrl}
          src={imageUrl}
          alt={`Aperçu du bilan de lecture ${year}, style ${REVIEW_THEMES[theme].label}`}
          className={`h-full w-full object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoadedUrl(imageUrl)}
          // Une image déjà en cache peut finir de charger avant que React n'attache onLoad.
          ref={(element) => {
            if (element?.complete && element.naturalWidth > 0) setLoadedUrl(imageUrl);
          }}
        />
      </div>

      <fieldset className="w-full max-w-sm">
        <legend className="mb-2 text-center text-sm font-medium text-stone-700">Style</legend>
        <div className="flex flex-wrap justify-center gap-2">
          {THEME_IDS.map((id) => {
            const option = REVIEW_THEMES[id];
            const locked = option.premium && !isPremium;
            const selected = id === theme;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectTheme(id)}
                aria-pressed={selected}
                title={locked ? `${option.label}, aperçu (Premium)` : option.label}
                className={`flex min-h-11 items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-stone-900 bg-stone-900 text-stone-50"
                    : "bg-card border-stone-200 text-stone-700 hover:border-stone-400"
                }`}
              >
                <span
                  className="h-7 w-7 rounded-full border border-black/10"
                  style={{
                    background: `linear-gradient(135deg, ${option.background} 55%, ${option.accent} 55%)`,
                  }}
                  aria-hidden="true"
                />
                {option.label}
                {locked && <LockSimple className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {!isPremium && (
          <p className="mt-3 text-center text-xs text-stone-500">
            Essayez les quatre styles Premium en aperçu, ou débloquez-les avec{" "}
            <Link href="/account#premium" className="text-accent-700 font-medium hover:underline">
              Premium
            </Link>
            .
          </p>
        )}
      </fieldset>

      {isLockedTheme ? (
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-stone-600">
            Le style {REVIEW_THEMES[theme].label} est réservé à Premium.
          </p>
          <Link href="/account#premium" className={buttonClasses("primary", "mt-3 w-full")}>
            Débloquer ce style
          </Link>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
          <Button onClick={() => handleShare("share")} isLoading={isSharing} className="w-full">
            {!isSharing && <ShareNetwork className="h-4 w-4" aria-hidden="true" />}
            Partager
          </Button>
          <Button variant="secondary" onClick={() => handleShare("download")} className="w-full">
            <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            Télécharger
          </Button>
        </div>
      )}
    </div>
  );
}
