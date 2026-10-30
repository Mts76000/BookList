"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Edition } from "@/lib/series-editions";

export interface EditionsRequest {
  titles: string[];
  author: string;
  referenceBookIds: string[];
}

/**
 * Éditions des tomes manquants (couverture, ISBN…), chargées après l'affichage. `null`
 * pendant le chargement ; ensuite, une édition ou `null` par titre (introuvable ou service
 * indisponible : une couverture générée la remplace).
 */
export function useSeriesEditions(
  request: EditionsRequest | null,
): Map<string, Edition | null> | null {
  const [editions, setEditions] = useState<Map<string, Edition | null> | null>(null);
  // Une chaîne stable : un nouvel objet à chaque rendu ne doit pas relancer la recherche.
  const key = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!key) return;
    const body = JSON.parse(key) as EditionsRequest;
    let cancelled = false;
    void apiFetch<{ editions: (Edition | null)[] }>("/api/series/editions", {
      method: "POST",
      json: body,
    }).then((result) => {
      if (cancelled) return;
      setEditions(
        new Map(
          body.titles.map((title, index) => [
            title,
            result.ok ? result.data.editions[index] : null,
          ]),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return key ? editions : null;
}
