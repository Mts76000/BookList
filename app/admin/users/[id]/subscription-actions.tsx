"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface SubscriptionActionsProps {
  userId: string;
  hasActiveSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  hasGrant: boolean;
  isTrialing: boolean;
  interval: string | null;
}

type Action =
  | { action: "grant"; days: number }
  | { action: "revoke_grant" }
  | { action: "cancel_at_period_end" }
  | { action: "resume" }
  | { action: "cancel_now" }
  | { action: "change_plan"; interval: "monthly" | "yearly" }
  | { action: "extend_trial"; days: number };

/** Actions d'abonnement de la fiche utilisateur de l'administration. */
export function SubscriptionActions({
  userId,
  hasActiveSubscription,
  cancelAtPeriodEnd,
  hasGrant,
  isTrialing,
  interval,
}: SubscriptionActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [days, setDays] = useState("30");
  const [confirmCancelNow, setConfirmCancelNow] = useState(false);

  async function run(body: Action) {
    setPending(body.action);
    const result = await apiFetch(`/api/admin/users/${userId}/subscription`, {
      method: "POST",
      json: body,
    });
    setPending(null);
    setConfirmCancelNow(false);
    toast(
      result.ok ? (result.message ?? "Fait.") : result.message,
      result.ok ? "success" : "error",
    );
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <Select label="Offrir Premium" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="30">1 mois</option>
            <option value="90">3 mois</option>
            <option value="180">6 mois</option>
            <option value="365">1 an</option>
          </Select>
        </div>
        <Button
          variant="secondary"
          isLoading={pending === "grant"}
          onClick={() => run({ action: "grant", days: Number(days) })}
        >
          {hasGrant ? "Prolonger l'offre" : "Offrir"}
        </Button>
        {hasGrant && (
          <Button
            variant="text"
            isLoading={pending === "revoke_grant"}
            onClick={() => run({ action: "revoke_grant" })}
          >
            Retirer l&apos;offre
          </Button>
        )}
      </div>

      {hasActiveSubscription && (
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
          {interval && (
            <Button
              variant="secondary"
              isLoading={pending === "change_plan"}
              onClick={() =>
                run({
                  action: "change_plan",
                  interval: interval === "yearly" ? "monthly" : "yearly",
                })
              }
            >
              Passer en {interval === "yearly" ? "mensuel" : "annuel"}
            </Button>
          )}
          {isTrialing && (
            <Button
              variant="secondary"
              isLoading={pending === "extend_trial"}
              onClick={() => run({ action: "extend_trial", days: 7 })}
            >
              Prolonger l&apos;essai de 7 jours
            </Button>
          )}
          {cancelAtPeriodEnd ? (
            <Button
              variant="secondary"
              isLoading={pending === "resume"}
              onClick={() => run({ action: "resume" })}
            >
              Réactiver l&apos;abonnement
            </Button>
          ) : (
            <Button
              variant="secondary"
              isLoading={pending === "cancel_at_period_end"}
              onClick={() => run({ action: "cancel_at_period_end" })}
            >
              Résilier en fin de période
            </Button>
          )}
          {confirmCancelNow ? (
            <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2">
              <span className="text-destructive text-sm">Couper l&apos;accès maintenant ?</span>
              <Button
                variant="destructive"
                isLoading={pending === "cancel_now"}
                onClick={() => run({ action: "cancel_now" })}
              >
                Oui
              </Button>
              <Button variant="text" onClick={() => setConfirmCancelNow(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmCancelNow(true)}>
              Résilier immédiatement
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
