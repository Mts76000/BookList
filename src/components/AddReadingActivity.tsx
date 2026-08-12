"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AddReadingActivity() {
  const router = useRouter()
  const [pagesRead, setPagesRead] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage("")

    try {
      const response = await fetch("/api/reading-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagesRead: parseInt(pagesRead),
          date,
        }),
      })

      if (!response.ok) throw new Error("Failed")

      setMessage("Lecture enregistrée")
      setIsError(false)
      setPagesRead("")
      router.refresh()
      setTimeout(() => setMessage(""), 3000)
    } catch {
      setMessage("Erreur lors de l'enregistrement")
      setIsError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="text-sm font-medium text-stone-900">Enregistrer votre lecture</h3>

      {message && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            isError
              ? "border border-red-200 bg-red-50 text-red-600"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Pages lues
            </label>
            <input
              type="number"
              value={pagesRead}
              onChange={(e) => setPagesRead(e.target.value)}
              min="0"
              required
              className="input-field"
              placeholder="Ex: 25"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="input-field"
            />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  )
}
