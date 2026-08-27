import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Loads .env.test into this (test runner) process too, so test files can talk to the same
// test database the webServer below uses (e.g. tests/e2e/helpers.ts's verifyEmailDirectly).
config({ path: ".env.test", quiet: true });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // NODE_ENV=test makes Next.js load .env.test (and skip .env.local) — see
    // https://nextjs.org/docs/app/guides/environment-variables#test-environment-variables.
    // Requires the test Postgres (docker compose, `postgres-test` service) to be running.
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: { NODE_ENV: "test" },
    timeout: 120_000,
  },
});
