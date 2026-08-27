"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const email = searchParams.get("email") ?? "";
  const [isLoading, setIsLoading] = useState(false);

  async function handleResend() {
    if (!email) return;
    setIsLoading(true);
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/" });
      toast("Email de vérification renvoyé.", "success");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <EnvelopeSimple size={40} className="text-primary" aria-hidden="true" />
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Vérifiez votre boîte mail
      </h1>
      <p className="text-muted-foreground text-sm">
        {email ? (
          <>
            Un email de vérification a été envoyé à <strong>{email}</strong>. Cliquez sur le lien
            pour activer votre compte.
          </>
        ) : (
          "Un email de vérification vous a été envoyé. Cliquez sur le lien pour activer votre compte."
        )}
      </p>
      {email ? (
        <Button type="button" variant="secondary" onClick={handleResend} isLoading={isLoading}>
          Renvoyer l&apos;email
        </Button>
      ) : null}
    </div>
  );
}
