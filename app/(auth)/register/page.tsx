"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/ui/google-button";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!tosAccepted) {
      setErrors({ tosAccepted: "Vous devez accepter les CGU pour continuer." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, tosAccepted, turnstileToken }),
      });
      const json = await res.json();

      if (!json.success) {
        toast(json.error.message, "error");
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Créer un compte</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>

      <GoogleButton onClick={handleGoogleSignIn} />

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <div className="bg-border h-px flex-1" />
        ou
        <div className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Nom"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          helperText="8 caractères minimum."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-foreground flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="border-border text-primary focus-visible:outline-ring mt-0.5 size-4 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/legal/terms" className="text-primary font-medium hover:underline">
                CGU
              </Link>
            </span>
          </label>
          {errors.tosAccepted ? (
            <p className="text-destructive text-xs" role="alert">
              {errors.tosAccepted}
            </p>
          ) : null}
        </div>

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <TurnstileWidget
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
          />
        ) : null}

        <Button type="submit" isLoading={isLoading} className="w-full">
          Créer mon compte
        </Button>
      </form>
    </div>
  );
}
