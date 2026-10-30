"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

/** Création d'un code promo Stripe. */
export function PromotionForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    code: "",
    kind: "percent",
    value: "",
    duration: "once",
    durationInMonths: "",
    maxRedemptions: "",
    expiresAt: "",
    firstTimeOnly: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await apiFetch("/api/admin/promotion-codes", {
      method: "POST",
      json: {
        code: form.code,
        kind: form.kind,
        value: form.value.replace(",", "."),
        duration: form.duration,
        durationInMonths: form.duration === "repeating" ? form.durationInMonths : undefined,
        maxRedemptions: form.maxRedemptions || undefined,
        expiresAt: form.expiresAt || undefined,
        firstTimeOnly: form.firstTimeOnly,
      },
    });
    setIsSaving(false);
    toast(
      result.ok ? (result.message ?? "Code créé.") : result.message,
      result.ok ? "success" : "error",
    );
    if (result.ok) {
      setForm({ ...form, code: "", value: "", maxRedemptions: "", expiresAt: "" });
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Code"
          required
          placeholder="RENTREE25"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          helperText="Ce que le client saisit au paiement."
        />
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <Select
            label="Remise"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            <option value="percent">Pourcentage</option>
            <option value="amount">Montant (€)</option>
          </Select>
          <Field
            label={form.kind === "percent" ? "%" : "€"}
            required
            inputMode="decimal"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <Select
            label="Durée"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          >
            <option value="once">Premier paiement</option>
            <option value="repeating">Plusieurs mois</option>
            <option value="forever">À vie</option>
          </Select>
          {form.duration === "repeating" && (
            <Field
              label="Mois"
              type="number"
              inputMode="numeric"
              min={1}
              max={36}
              required
              value={form.durationInMonths}
              onChange={(e) => setForm({ ...form, durationInMonths: e.target.value })}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Utilisations max"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Illimité"
            value={form.maxRedemptions}
            onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
          />
          <Field
            label="Expire le"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={form.firstTimeOnly}
          onChange={(e) => setForm({ ...form, firstTimeOnly: e.target.checked })}
          className="accent-accent-600 size-4"
        />
        Réservé aux nouveaux abonnés
      </label>
      <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
        Créer le code
      </Button>
    </form>
  );
}

/** Active ou désactive un code existant. */
export function PromotionToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function toggle() {
    setIsLoading(true);
    const result = await apiFetch(`/api/admin/promotion-codes/${id}`, {
      method: "PATCH",
      json: { active: !active },
    });
    setIsLoading(false);
    toast(
      result.ok ? (result.message ?? "Fait.") : result.message,
      result.ok ? "success" : "error",
    );
    if (result.ok) router.refresh();
  }

  return (
    <Button variant="text" isLoading={isLoading} onClick={toggle}>
      {active ? "Désactiver" : "Réactiver"}
    </Button>
  );
}
