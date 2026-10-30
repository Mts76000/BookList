"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

import { BOOK_SORTS, BOOKS_SORT_COOKIE, STATUS_LABELS } from "@/lib/book-status";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

/** Mémorise le tri pour le prochain passage sur l'étagère (lu côté serveur, voir app/books). */
function saveSortPreference(sort: string) {
  document.cookie = `${BOOKS_SORT_COOKIE}=${sort}; path=/; max-age=${ONE_YEAR_S}; samesite=lax`;
}

interface BooksFilterProps {
  sortBy: string;
  genre?: string;
  status?: string;
  tag?: string;
  genres: string[];
  tags: string[];
}

export function BooksFilter({ sortBy, genre, status, tag, genres, tags }: BooksFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);

  // Recherche différée de 300 ms : sans ce délai, chaque frappe déclencherait une
  // navigation et un nouveau rendu serveur de la bibliothèque. Rien n'est fait tant que le
  // texte n'a pas changé : naviguer au montage ajoutait une entrée d'historique et
  // ramenait en haut de la page au retour depuis la fiche d'un livre.
  useEffect(() => {
    if (search === urlSearch) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("sort", sortBy);
      if (genre) params.set("genre", genre);
      if (status) params.set("status", status);
      if (tag) params.set("tag", tag);

      // replace et non push : chaque frappe n'a pas à devenir une étape du bouton retour.
      router.replace(`/books?${params}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, urlSearch, sortBy, genre, status, tag, router]);

  function changeSort(sort: string) {
    saveSortPreference(sort);
    router.push(buildUrl({ sort }));
  }

  const buildUrl = (updates: { sort?: string; genre?: string; status?: string; tag?: string }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("sort", updates.sort ?? sortBy);
    const nextGenre = "genre" in updates ? updates.genre : genre;
    if (nextGenre) params.set("genre", nextGenre);
    const nextStatus = "status" in updates ? updates.status : status;
    if (nextStatus) params.set("status", nextStatus);
    const nextTag = "tag" in updates ? updates.tag : tag;
    if (nextTag) params.set("tag", nextTag);
    return `/books?${params.toString()}`;
  };

  return (
    <div className="mb-6 space-y-3">
      <Field
        label="Rechercher un livre"
        hideLabel
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un titre ou auteur..."
      />

      {/* Centrés sur mobile : une ligne incomplète ne reste pas collée à gauche. */}
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        <Select
          label="Trier par"
          hideLabel
          value={sortBy}
          onChange={(e) => changeSort(e.target.value)}
          className="w-auto min-w-[10rem]"
        >
          {Object.entries(BOOK_SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              Trier : {label}
            </option>
          ))}
        </Select>

        <Select
          label="Filtrer par statut"
          hideLabel
          value={status || ""}
          onChange={(e) => router.push(buildUrl({ status: e.target.value }))}
          className="w-auto min-w-[10rem]"
        >
          <option value="">Statut : Tous</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {genres.length > 0 && (
          <Select
            label="Filtrer par genre"
            hideLabel
            value={genre || ""}
            onChange={(e) => router.push(buildUrl({ genre: e.target.value }))}
            className="w-auto min-w-[10rem]"
          >
            <option value="">Genre : Tous</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        )}

        {tags.length > 0 && (
          <Select
            label="Filtrer par étagère"
            hideLabel
            value={tag || ""}
            onChange={(e) => router.push(buildUrl({ tag: e.target.value }))}
            className="w-auto min-w-[10rem]"
          >
            <option value="">Étagère : Toutes</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
