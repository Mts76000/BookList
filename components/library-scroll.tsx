"use client";

import { useEffect } from "react";

const KEY = "booklist:library-position";

interface LibraryPosition {
  /** Adresse exacte de l'étagère (filtres, tri et page compris). */
  url: string;
  y: number;
}

function read(): LibraryPosition | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LibraryPosition) : null;
  } catch {
    return null;
  }
}

/**
 * Adresse de l'étagère d'où l'on vient, avec ses filtres, ou `null` si la fiche a été
 * ouverte d'ailleurs (accueil, citations, lien direct).
 */
export function libraryReturnUrl(): string | null {
  return read()?.url ?? null;
}

/**
 * Ramène l'étagère à l'endroit où on l'a quittée. Le défilement natif du navigateur ne
 * suffit pas : la page est rendue côté serveur à chaque retour, et sa hauteur n'est pas
 * encore la bonne quand le navigateur restaure la position, qui retombait vers le haut.
 *
 * La position est notée au clic sur une fiche, puis consommée au retour sur la même
 * adresse ; un passage par le menu ouvre l'étagère en haut, comme attendu.
 */
export function LibraryScrollMemory() {
  useEffect(() => {
    const here = location.pathname + location.search;
    const saved = read();
    // Effacée seulement une fois la position rendue : en développement, React monte l'effet
    // deux fois, et l'effacer d'emblée privait le second montage de la position.
    const forget = () => {
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        // Stockage indisponible : on garde simplement le comportement par défaut.
      }
    };

    let frame = 0;
    if (saved?.url === here && saved.y > 0) {
      // Quelques images d'affilée : les couvertures et la mise en page peuvent encore
      // allonger la page juste après le montage.
      let attempts = 0;
      const restore = () => {
        window.scrollTo(0, saved.y);
        attempts += 1;
        if (Math.abs(window.scrollY - saved.y) > 2 && attempts < 20) {
          frame = requestAnimationFrame(restore);
        } else {
          forget();
        }
      };
      frame = requestAnimationFrame(restore);
    } else {
      forget();
    }

    function remember(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a[href^='/books/']");
      if (!link) return;
      try {
        sessionStorage.setItem(
          KEY,
          JSON.stringify({ url: location.pathname + location.search, y: window.scrollY }),
        );
      } catch {
        // Idem : sans stockage, le retour se fera en haut de l'étagère.
      }
    }

    document.addEventListener("click", remember, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", remember, true);
    };
  }, []);

  return null;
}
