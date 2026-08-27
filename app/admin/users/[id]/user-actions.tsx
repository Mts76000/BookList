"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

interface UserActionsProps {
  userId: string;
  role: string;
  isAnonymized: boolean;
  /** L'administrateur consulte sa propre fiche : les actions ne s'appliquent pas à lui-même. */
  isSelf: boolean;
  activeSessions: number;
}

export function UserActions({
  userId,
  role,
  isAnonymized,
  isSelf,
  activeSessions,
}: UserActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<"role" | "sessions" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isSelf) {
    return (
      <p className="max-w-xs text-sm text-stone-500">
        Il s&apos;agit de votre propre compte : rôle, sessions et suppression se gèrent depuis votre
        page Compte.
      </p>
    );
  }

  if (isAnonymized) {
    return <p className="text-sm text-stone-500">Compte supprimé : aucune action possible.</p>;
  }

  async function run(
    action: "role" | "sessions" | "delete",
    request: () => Promise<{ ok: boolean; message: string }>,
  ) {
    setPending(action);
    try {
      const result = await request();
      toast(result.message, result.ok ? "success" : "error");
      if (result.ok) router.refresh();
    } finally {
      setPending(null);
    }
  }

  const nextRole = role === "admin" ? "user" : "admin";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        isLoading={pending === "role"}
        onClick={() =>
          run("role", async () => {
            const result = await apiFetch(`/api/admin/users/${userId}`, {
              method: "PATCH",
              json: { role: nextRole },
            });
            return {
              ok: result.ok,
              message: result.ok ? (result.message ?? "Rôle mis à jour.") : result.message,
            };
          })
        }
      >
        {role === "admin" ? "Retirer le rôle admin" : "Promouvoir administrateur"}
      </Button>

      <Button
        variant="secondary"
        disabled={activeSessions === 0}
        isLoading={pending === "sessions"}
        onClick={() =>
          run("sessions", async () => {
            const result = await apiFetch(`/api/admin/users/${userId}/sessions`, {
              method: "DELETE",
            });
            return {
              ok: result.ok,
              message: result.ok ? (result.message ?? "Sessions révoquées.") : result.message,
            };
          })
        }
      >
        Révoquer les sessions
      </Button>

      {confirmDelete ? (
        <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2">
          <span className="text-destructive text-sm">Supprimer définitivement ?</span>
          <Button
            variant="destructive"
            isLoading={pending === "delete"}
            onClick={() =>
              run("delete", async () => {
                const result = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
                return {
                  ok: result.ok,
                  message: result.ok ? (result.message ?? "Compte supprimé.") : result.message,
                };
              })
            }
          >
            Oui
          </Button>
          <Button variant="text" onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          Supprimer le compte
        </Button>
      )}
    </div>
  );
}
