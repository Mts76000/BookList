"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const STATUS_LABELS: Record<string, string> = {
  TO_READ: "À lire",
  READING: "En cours",
  FINISHED: "Terminé",
}

const SORT_LABELS: Record<string, string> = {
  date: "Plus récents",
  oldest: "Plus anciens",
  title: "Titre",
  rating: "Mieux notés",
  pages: "Plus longs",
}

interface BooksFilterProps {
  sortBy: string
  genre?: string
  status?: string
  genres: string[]
}

export function BooksFilter({ sortBy, genre, status, genres }: BooksFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("sort", sortBy)
      if (genre) params.set("genre", genre)
      if (status) params.set("status", status)

      const query = params.toString()
      router.push(query ? `/books?${query}` : "/books")
    }, 300)

    return () => clearTimeout(timeout)
  }, [search, sortBy, genre, status, router])

  const buildUrl = (updates: { sort?: string; genre?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    params.set("sort", updates.sort ?? sortBy)
    if (("genre" in updates ? updates.genre : genre) !== undefined) {
      const g = "genre" in updates ? updates.genre : genre
      if (g) params.set("genre", g)
    }
    if (("status" in updates ? updates.status : status) !== undefined) {
      const s = "status" in updates ? updates.status : status
      if (s) params.set("status", s)
    }
    return `/books?${params.toString()}`
  }

  return (
    <div className="mb-6 space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un titre ou auteur..."
        className="input-field w-full"
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={sortBy}
          onChange={(e) => router.push(buildUrl({ sort: e.target.value }))}
          className="input-field w-auto min-w-[10rem] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%238a7a63%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 text-sm"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              Trier : {label}
            </option>
          ))}
        </select>

        <select
          value={status || ""}
          onChange={(e) => router.push(buildUrl({ status: e.target.value }))}
          className="input-field w-auto min-w-[10rem] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%238a7a63%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 text-sm"
        >
          <option value="">Statut : Tous</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {genres.length > 0 && (
          <select
            value={genre || ""}
            onChange={(e) => router.push(buildUrl({ genre: e.target.value }))}
            className="input-field w-auto min-w-[10rem] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%238a7a63%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 text-sm"
          >
            <option value="">Genre : Tous</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
