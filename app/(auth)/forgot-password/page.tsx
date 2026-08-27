"use client";

import { useState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const json = await res.json();

      if (!json.success) {
        toast(json.error.message, "error");
        return;
      }
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Email envoyé</h1>
        <p className="text-muted-foreground text-sm">
          Si un compte existe avec l&apos;adresse {email}, un lien de réinitialisation vient
          d&apos;être envoyé. Le lien est valable 1 heure.
        </p>
        <Link href="/login" className="text-primary text-sm font-medium hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Mot de passe oublié
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <TurnstileWidget
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
          />
        ) : null}

        <Button type="submit" isLoading={isLoading} className="w-full">
          Envoyer le lien
        </Button>
      </form>

      <Link href="/login" className="text-primary text-sm font-medium hover:underline">
        Retour à la connexion
      </Link>
    </div>
  );
}
