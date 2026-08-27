import { createAuthClient } from "better-auth/react";

// Client component code must never import lib/env.ts: it validates server-only secrets
// via process.env at module load, which breaks when bundled for the browser.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
