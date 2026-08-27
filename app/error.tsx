"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Client error boundary for this route segment. Server errors already never leak stack
// traces (lib/api-response.ts); this only ever shows a generic message to the user.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Swap this for an external monitoring provider (e.g. Sentry) without touching
    // anything else in the error-handling path — this is the single integration point.
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Une erreur est survenue
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Désolé, quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
      </p>
      <Button type="button" onClick={reset}>
        Réessayer
      </Button>
    </main>
  );
}
