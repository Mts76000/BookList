import { describe, expect, it } from "vitest";
import { envSchema } from "@/lib/env";

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
