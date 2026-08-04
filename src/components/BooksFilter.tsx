"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export function BooksFilter({ sortBy, genre }: { sortBy: string; genre?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [year, setYear] = useState(searchParams.get("year") || "")

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (year) params.set("year", year)
      params.set("sort", sortBy)
      if (genre) params.set("genre", genre)

      const query = params.toString()
      router.push(query ? `/books?${query}` : "/books")
    }, 300)

    return () => clearTimeout(timeout)
  }, [search, year, sortBy, genre, router])

  return (
    <div className="mb-4 flex gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un titre ou auteur..."
        className="input-field flex-1"
      />
      <input
        type="number"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder="Année"
        min="1900"
        max="2100"
        className="input-field w-24"
      />
    </div>
  )
}
