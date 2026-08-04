"use client"

import { useState } from "react"

export function AddReadingActivity() {
  const [pagesRead, setPagesRead] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

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

      if (!response.ok) {
        throw new Error("Failed to add reading activity")
      }

      setMessage("Activité enregistrée avec succès !")
      setPagesRead("")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      setMessage("Erreur lors de l'enregistrement")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Enregistrer votre lecture</h3>
      
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg ${
          message.includes("succès")
            ? "bg-green-50 border border-green-200 text-green-600"
            : "bg-red-50 border border-red-200 text-red-600"
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de pages lues
          </label>
          <input
            type="number"
            value={pagesRead}
            onChange={(e) => setPagesRead(e.target.value)}
            min="0"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Ex: 25"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  )
}
