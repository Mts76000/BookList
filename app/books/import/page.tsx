"use client";

import { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: { line: number; message: string }[];
}

const CSV_TEMPLATE =
  "title,author,isbn,genre,pageCount,publishedDate,userRating,userStartDate,userEndDate,status\n" +
  "Dune,Frank Herbert,9782266353800,Science-Fiction,928,1965,5,2024-01-01,2024-01-20,FINISHED\n";

export default function ImportBooksPage() {
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setCsvContent(await file.text());
  }

  async function handleImport() {
    setIsSubmitting(true);
    const response = await apiFetch<ImportResult>("/api/books/import", {
      method: "POST",
      json: { csv: csvContent },
    });
    setIsSubmitting(false);

    if (!response.ok) {
      toast(response.message, "error");
      return;
    }
    setResult(response.data);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-import-booklist.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8"
      >
        <header className="mb-6">
          <h1 className="font-serif text-2xl text-stone-900">Importer des livres</h1>
          <p className="mt-1 text-sm text-stone-500">
            Importez votre bibliothèque depuis un fichier CSV (500 lignes maximum).
          </p>
        </header>

        <div className="card p-5 sm:p-6">
          <button
            type="button"
            onClick={downloadTemplate}
            className="mb-4 text-sm font-medium text-stone-600 hover:text-stone-900 hover:underline"
          >
            Télécharger un modèle CSV
          </button>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="csv-file" className="text-sm font-medium tracking-tight text-stone-700">
              Fichier CSV
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="border-border bg-card w-full rounded-[var(--radius-sm)] border px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700"
            />
            {fileName && <p className="text-xs text-stone-500">{fileName}</p>}
          </div>

          {result && (
            <div className="mt-4 space-y-2">
              <div className="border-moss-200 bg-moss-50 text-moss-700 rounded-[var(--radius-sm)] border px-4 py-3 text-sm">
                {result.imported} livre{result.imported !== 1 ? "s" : ""} importé
                {result.imported !== 1 ? "s" : ""}
                {result.skipped > 0 && `, ${result.skipped} déjà en bibliothèque`}
                {result.failed > 0 && `, ${result.failed} ligne(s) ignorée(s)`}
              </div>
              {result.errors.length > 0 && (
                <div className="border-accent-200 bg-accent-50 text-accent-800 max-h-48 overflow-y-auto rounded-[var(--radius-sm)] border px-4 py-3 text-xs">
                  {result.errors.map((entry) => (
                    <p key={entry.line}>
                      Ligne {entry.line} : {entry.message}
                    </p>
                  ))}
                </div>
              )}
              <Link href="/books" className={buttonClasses("primary", "mt-2 w-full")}>
                Voir ma bibliothèque
              </Link>
            </div>
          )}

          {!result && (
            <Button
              onClick={handleImport}
              isLoading={isSubmitting}
              disabled={!csvContent.trim()}
              className="mt-5 w-full"
            >
              {isSubmitting ? "Import…" : "Importer"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
