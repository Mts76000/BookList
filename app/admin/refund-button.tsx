"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

/** Remboursement total ou partiel d'un paiement, avec confirmation. */
export function RefundButton({
  chargeId,
  refundableCents,
}: {
  chargeId: string;
  refundableCents: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState((refundableCents / 100).toFixed(2));
  const [isLoading, setIsLoading] = useState(false);

  async function handleRefund() {
    const cents = Math.round(Number.parseFloat(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0 || cents > refundableCents) {
      toast("Montant invalide.", "error");
      return;
    }
    setIsLoading(true);
    const result = await apiFetch(`/api/admin/payments/${chargeId}/refund`, {
      method: "POST",
      json: cents === refundableCents ? {} : { amountCents: cents },
    });
    setIsLoading(false);
    toast(
      result.ok ? (result.message ?? "Remboursé.") : result.message,
      result.ok ? "success" : "error",
    );
    if (result.ok) {
      setIsOpen(false);
      router.refresh();
    }
  }

  if (!isOpen) {
    return (
      <Button variant="text" onClick={() => setIsOpen(true)}>
        Rembourser
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
      <div className="w-28">
        <Field
          label="Montant (€)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button variant="destructive" isLoading={isLoading} onClick={handleRefund}>
        Rembourser
      </Button>
      <Button variant="text" onClick={() => setIsOpen(false)}>
        Annuler
      </Button>
    </div>
  );
}
