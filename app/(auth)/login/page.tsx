"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/ui/google-button";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe, turnstileToken }),
      });
      const json = await res.json();

      if (!json.success) {
        toast(json.error.message, "error");
        return;
      }

      router.push(searchParams.get("redirectTo") ?? "/");
      router.refresh();
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
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Créer un compte
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="text-foreground flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="border-border text-primary focus-visible:outline-ring size-4 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            Se souvenir de moi
          </label>
          <Link href="/forgot-password" className="text-primary font-medium hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <TurnstileWidget
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
          />
        ) : null}

        <Button type="submit" isLoading={isLoading} className="w-full">
          Se connecter
        </Button>
      </form>
    </div>
  );
}
