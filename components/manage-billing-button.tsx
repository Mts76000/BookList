"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

/** Ouvre le portail client Stripe : carte, factures, résiliation. */
export function ManageBillingButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const result = await apiFetch<{ url: string }>("/api/billing/portal", { method: "POST" });
    if (!result.ok) {
      setIsLoading(false);
      toast(result.message, "error");
      return;
    }
    window.location.assign(result.data.url);
  }

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      isLoading={isLoading}
      className="w-full sm:w-auto"
    >
      Gérer mon abonnement
    </Button>
  );
}
