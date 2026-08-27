"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

/** Date du jour au format attendu par un champ `type="date"`. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddReadingActivity() {
  const router = useRouter();
  const { toast } = useToast();
  const [pagesRead, setPagesRead] = useState("");
  const [date, setDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reading-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagesRead, date }),
      });
      const json = await res.json();

      if (!json.success) {
        toast(json.error.message, "error");
        return;
      }

      toast("Lecture enregistrée.", "success");
      setPagesRead("");
      // Rafraîchit le graphe de contribution et les statistiques rendus côté serveur.
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="text-sm font-medium text-stone-900">Enregistrer votre lecture</h3>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Pages lues"
            type="number"
            inputMode="numeric"
            min={0}
            required
            value={pagesRead}
            onChange={(e) => setPagesRead(e.target.value)}
            placeholder="Ex : 25"
          />
          <Field
            label="Date"
            type="date"
            required
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
