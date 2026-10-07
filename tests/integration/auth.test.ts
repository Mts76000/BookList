import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: async () => true,
}));

const { POST: registerHandler } = await import("@/app/api/register/route");
const { POST: loginHandler } = await import("@/app/api/login/route");
const { POST: forgotPasswordHandler } = await import("@/app/api/forgot-password/route");
const { POST: cronCleanupHandler } = await import("@/app/api/cron/cleanup-expired-tokens/route");
const { auth } = await import("@/lib/auth");

let ipCounter = 0;

// Each call gets its own fake IP: the register/login rate limiters (lib/rate-limit.ts) are
// module-level singletons keyed by IP, shared across every test in this file (real distinct
// client requests would naturally have distinct IPs — reusing one IP for every test call
// would exhaust the rate limit budget after a handful of tests, unrelated to what's tested).
function jsonRequest(url: string, body: unknown) {
  ipCounter += 1;
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      "x-forwarded-for": `10.0.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  // Cleanup instead of a literal transaction rollback: the route handlers open their own
  // pooled connections, so a single wrapping test transaction isn't practical here.
  await db.execute(
    sql`TRUNCATE TABLE "user", "session", "account", "verification", "audit_logs" CASCADE`,
  );
});

describe("POST /api/register", () => {
  const validBody = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "password123",
    tosAccepted: true,
    turnstileToken: "test-token",
  };

  it("creates a user and returns 201", async () => {
    const res = await registerHandler(jsonRequest("http://localhost:3000/api/register", validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe("ada@example.com");
  });

  it("rejects registration without accepting the terms", async () => {
    const res = await registerHandler(
      jsonRequest("http://localhost:3000/api/register", { ...validBody, tosAccepted: false }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not create a second row and does not leak that the email exists (enumeration protection)", async () => {
    await registerHandler(jsonRequest("http://localhost:3000/api/register", validBody));
    // better-auth's built-in email-enumeration protection (requireEmailVerification: true)
    // returns a synthetic success response for a second signup with the same email, instead
    // of a CONFLICT error, so an attacker can't use signup responses to discover which
    // emails are already registered. We assert on the real invariant instead: no duplicate
    // row is persisted.
    const res = await registerHandler(jsonRequest("http://localhost:3000/api/register", validBody));
    expect(res.status).toBe(201);

    const rows = await db.execute(sql`SELECT id FROM "user" WHERE email = ${validBody.email}`);
    expect(rows.rows).toHaveLength(1);
  });
});

describe("POST /api/login", () => {
  const credentials = {
    name: "Grace Hopper",
    email: "grace@example.com",
    password: "password123",
    tosAccepted: true,
    turnstileToken: "test-token",
  };

  it("rejects login before the email is verified", async () => {
    await registerHandler(jsonRequest("http://localhost:3000/api/register", credentials));

    const res = await loginHandler(
      jsonRequest("http://localhost:3000/api/login", {
        email: credentials.email,
        password: credentials.password,
        turnstileToken: "test-token",
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe(
      "Veuillez vérifier votre adresse email avant de vous connecter.",
    );
  });

  it("logs in and sets a session cookie once the email is verified", async () => {
    await registerHandler(jsonRequest("http://localhost:3000/api/register", credentials));
    await db.execute(
      sql`UPDATE "user" SET email_verified = true WHERE email = ${credentials.email}`,
    );

    const res = await loginHandler(
      jsonRequest("http://localhost:3000/api/login", {
        email: credentials.email,
        password: credentials.password,
        turnstileToken: "test-token",
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/better-auth\.session_token=/);
  });

  it("rejects an incorrect password", async () => {
    await registerHandler(jsonRequest("http://localhost:3000/api/register", credentials));
    await db.execute(
      sql`UPDATE "user" SET email_verified = true WHERE email = ${credentials.email}`,
    );

    const res = await loginHandler(
      jsonRequest("http://localhost:3000/api/login", {
        email: credentials.email,
        password: "wrong-password",
        turnstileToken: "test-token",
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/forgot-password", () => {
  it("returns success without leaking whether the email exists", async () => {
    const res = await forgotPasswordHandler(
      jsonRequest("http://localhost:3000/api/forgot-password", {
        email: "unknown@example.com",
        turnstileToken: "test-token",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("better-auth native endpoints", () => {
  // These are only reachable through our own routes (Turnstile + rate limiting).
  it.each(["/sign-up/email", "/sign-in/email", "/request-password-reset"])(
    "returns 404 for %s",
    async (path) => {
      const res = await auth.handler(
        jsonRequest(`http://localhost:3000/api/auth${path}`, {
          email: "someone@example.com",
          password: "password123",
          name: "Someone",
        }),
      );
      expect(res.status).toBe(404);
    },
  );
});

describe("POST /api/cron/cleanup-expired-tokens", () => {
  function cronRequest(authorization?: string) {
    return new Request("http://localhost:3000/api/cron/cleanup-expired-tokens", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    });
  }

  it("rejects a missing or wrong secret", async () => {
    expect((await cronCleanupHandler(cronRequest())).status).toBe(401);
    expect((await cronCleanupHandler(cronRequest("Bearer wrong-secret"))).status).toBe(401);
  });

  it("runs with the right secret", async () => {
    const res = await cronCleanupHandler(cronRequest(`Bearer ${process.env.CRON_SECRET}`));
    expect(res.status).toBe(200);
  });
});
