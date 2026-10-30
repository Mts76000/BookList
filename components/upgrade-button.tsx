"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import type { BillingInterval } from "@/lib/plans";

interface UpgradeButtonProps {
  interval: BillingInterval;
  /** Faux tant que Stripe n'est pas configuré : le bouton reste visible mais inactif. */
  billingEnabled: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
}

/** Ouvre le paiement Stripe pour la formule choisie. */
export function UpgradeButton({
  interval,
  billingEnabled,
  variant = "primary",
  className = "",
  children,
}: UpgradeButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const result = await apiFetch<{ url: string }>("/api/billing/checkout", {
      method: "POST",
      json: { interval },
    });
    if (!result.ok) {
      setIsLoading(false);
      toast(result.message, "error");
      return;
    }
    // Pas de remise à zéro de l'état : la page se quitte pour Stripe.
    window.location.assign(result.data.url);
  }

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      isLoading={isLoading}
      disabled={!billingEnabled}
      className={className}
    >
      {billingEnabled ? children : "Bientôt disponible"}
    </Button>
  );
}
