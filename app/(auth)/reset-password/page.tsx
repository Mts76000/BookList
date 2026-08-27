"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    try {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) {
        toast(error.message ?? "Lien invalide ou expiré.", "error");
        return;
      }
      toast("Mot de passe mis à jour.", "success");
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Lien invalide</h1>
        <p className="text-muted-foreground text-sm">
          Ce lien de réinitialisation est invalide ou a expiré.
        </p>
        <Link href="/forgot-password" className="text-primary text-sm font-medium hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Réinitialiser le mot de passe
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          helperText="8 caractères minimum."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button type="submit" isLoading={isLoading} className="w-full">
          Réinitialiser
        </Button>
      </form>
    </div>
  );
}
