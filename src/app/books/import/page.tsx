"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Navigation } from "@/components/Navigation"

interface ImportResult {
  imported: number
  failed: number
  errors: { line: number; message: string }[]
}

const CSV_TEMPLATE =
  "title,author,isbn,genre,pageCount,publishedDate,userRating,userStartDate,userEndDate,status\n" +
  "Dune,Frank Herbert,9782266353800,Science-Fiction,928,1965,5,2024-01-01,2024-01-20,FINISHED\n"

export default function ImportBooks() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("")
  const [csvContent, setCsvContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    setError("")
    const text = await file.text()
    setCsvContent(text)
  }

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError("Sélectionnez un fichier CSV")
      return
    }

    setIsSubmitting(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/books/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvContent }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Échec de l'import")
        return
      }

      setResult(data)
    } catch {
      setError("Échec de l'import")
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "modele-import-booklist.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-stone-900">
          Importer des livres
        </h1>
        <p className="mb-6 text-sm text-stone-500">
          Importez votre bibliothèque depuis un fichier CSV (500 lignes max).
        </p>

        <div className="card p-5 sm:p-6">
          <button
            onClick={downloadTemplate}
            className="mb-4 text-sm font-medium text-stone-600 hover:text-stone-900 hover:underline"
          >
            Télécharger un modèle CSV
          </button>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Fichier CSV
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700"
            />
            {fileName && <p className="mt-1.5 text-xs text-stone-500">{fileName}</p>}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {result.imported} livre{result.imported !== 1 ? "s" : ""} importé
                {result.imported !== 1 ? "s" : ""}
                {result.failed > 0 && `, ${result.failed} ligne(s) ignorée(s)`}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  {result.errors.map((e, i) => (
                    <p key={i}>
                      Ligne {e.line} : {e.message}
                    </p>
                  ))}
                </div>
              )}
              <Link href="/books" className="btn-primary mt-2 block text-center">
                Voir ma bibliothèque
              </Link>
            </div>
          )}

          {!result && (
            <button
              onClick={handleImport}
              disabled={isSubmitting || !csvContent.trim()}
              className="btn-primary mt-5 w-full"
            >
              {isSubmitting ? "Import..." : "Importer"}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
