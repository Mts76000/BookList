import { describe, expect, it } from "vitest";
import { assertNoBuildPlaceholders, envSchema, type Env } from "@/lib/env";

const validEnv = {
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://user:pass@localhost:5432/db_test",
  BETTER_AUTH_SECRET: "a".repeat(32),
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  RESEND_API_KEY: "re_key",
  CONTACT_EMAIL: "admin@example.com",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key",
  TURNSTILE_SECRET_KEY: "secret-key",
  CRON_SECRET: "a".repeat(16),
};

describe("envSchema", () => {
  it("accepts a fully valid environment", () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it("rejects a missing required variable", () => {
    const rest: Record<string, string> = { ...validEnv };
    delete rest.DATABASE_URL;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("treats an empty optional variable as unset instead of failing format validation", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      UPSTASH_REDIS_REST_URL: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.UPSTASH_REDIS_REST_URL).toBeUndefined();
    }
  });

  it("rejects a malformed URL for a required URL field", () => {
    const result = envSchema.safeParse({ ...validEnv, NEXT_PUBLIC_APP_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects a BETTER_AUTH_SECRET shorter than 32 characters", () => {
    const result = envSchema.safeParse({ ...validEnv, BETTER_AUTH_SECRET: "short" });
    expect(result.success).toBe(false);
  });
});

describe("assertNoBuildPlaceholders", () => {
  /** Environnement de production complet, avec les valeurs de remplacement demandées. */
  function productionEnv(overrides: Partial<Env> = {}): Env {
    return {
      ...validEnv,
      NODE_ENV: "production",
      ...overrides,
    } as Env;
  }

  it("laisse passer un environnement de production correctement renseigné", () => {
    expect(() => assertNoBuildPlaceholders(productionEnv(), { isBuildPhase: false })).not.toThrow();
  });

  it("refuse de démarrer si un secret porte encore sa valeur de remplacement", () => {
    expect(() =>
      assertNoBuildPlaceholders(
        productionEnv({ BETTER_AUTH_SECRET: "build-placeholder-secret-at-least-32-chars" }),
        { isBuildPhase: false },
      ),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("nomme toutes les variables concernées, pas seulement la première", () => {
    expect(() =>
      assertNoBuildPlaceholders(
        productionEnv({
          BETTER_AUTH_SECRET: "build-placeholder-secret-at-least-32-chars",
          RESEND_API_KEY: "build-placeholder",
        }),
        { isBuildPhase: false },
      ),
    ).toThrow(/BETTER_AUTH_SECRET.*RESEND_API_KEY/);
  });

  it("tolère les valeurs de remplacement pendant le build, où elles sont légitimes", () => {
    expect(() =>
      assertNoBuildPlaceholders(productionEnv({ RESEND_API_KEY: "build-placeholder" }), {
        isBuildPhase: true,
      }),
    ).not.toThrow();
  });

  it("ne contrôle rien hors production : le développement local n'est pas concerné", () => {
    expect(() =>
      assertNoBuildPlaceholders(
        { ...validEnv, NODE_ENV: "development", RESEND_API_KEY: "build-placeholder" } as Env,
        { isBuildPhase: false },
      ),
    ).not.toThrow();
  });
});
