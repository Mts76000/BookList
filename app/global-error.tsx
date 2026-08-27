"use client";

import { useEffect } from "react";

// Catches errors in the root layout itself, where app/error.tsx cannot help (it renders
// inside the layout). Must render its own <html>/<body> since the root layout is bypassed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-white px-4 text-center text-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">Une erreur critique est survenue</h1>
        <p className="max-w-sm text-sm text-zinc-600">
          L&apos;application n&apos;a pas pu se charger. Merci de réessayer.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
