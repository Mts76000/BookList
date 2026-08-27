import type { Page } from "@playwright/test";
import { Client } from "pg";

/**
 * Replaces the real Cloudflare Turnstile script with a stub that instantly "solves" the
 * challenge. The server still performs a real siteverify call using the official Cloudflare
 * "always passes" test secret/token pair configured in .env.test — only the interactive
 * widget is mocked, not the server-side verification logic.
 */
export async function mockTurnstile(page: Page) {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile = {
        render: (el, opts) => {
          opts.callback("XXXX.DUMMY.TOKEN.XXXX");
          window.__turnstileMockSolved = true;
          return "mock-widget";
        },
        reset: () => {},
      };`,
    }),
  );
}

/**
 * The register page's TurnstileWidget loads the (mocked) script asynchronously and polls
 * for it, so a token isn't necessarily set the instant the form is filled in. Call this
 * after page.goto("/register") and before submitting, or the request fails client-side
 * validation (turnstileToken required, min length 1).
 */
export async function waitForTurnstileReady(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { __turnstileMockSolved?: boolean }).__turnstileMockSolved === true,
  );
}

/** Bypasses real email delivery: marks a user's email as verified directly in the test DB. */
export async function verifyEmailDirectly(email: string) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query('UPDATE "user" SET email_verified = true WHERE email = $1', [
    email,
  ]);
  await client.end();
  if (result.rowCount === 0) {
    throw new Error(
      `verifyEmailDirectly: no user row found for ${email} (${process.env.DATABASE_URL})`,
    );
  }
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
}

let ipCounter = 0;

/**
 * A distinct fake IP per test/context. The register/login rate limiters (lib/rate-limit.ts)
 * are keyed by IP; every request from a local Playwright browser otherwise looks identical
 * to the server, so tests would share (and exhaust) one rate-limit bucket instead of each
 * getting its own, as real distinct users would.
 */
export function uniqueIp() {
  ipCounter += 1;
  return `10.10.0.${ipCounter}`;
}
