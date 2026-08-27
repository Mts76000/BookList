import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createLocalAccountIssuer } from "better-auth/db";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";
import { isBcryptHash } from "@/lib/legacy-password";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: async () => true,
}));

const { POST: loginHandler } = await import("@/app/api/login/route");

const PASSWORD = "motdepasse-v1";
const EMAIL = "migre@booklist.fr";

let ipCounter = 100;

// Une IP distincte par appel : le rate limiter de la connexion est un singleton de module
// partagé par tous les tests du fichier (voir tests/integration/auth.test.ts).
function loginRequest(body: unknown) {
  ipCounter += 1;
  return new Request("http://localhost:3000/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      "x-forwarded-for": `10.0.1.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

/** Reproduit un compte tel que la migration depuis BookList v1 le crée : hash bcrypt. */
async function seedLegacyUser(): Promise<string> {
  const userId = randomUUID();
  const hash = await bcrypt.hash(PASSWORD, 12);
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (${userId}, 'Lecteur Migré', ${EMAIL}, true, 'user')`,
  );
  await db.execute(
    sql`INSERT INTO "account" (id, account_id, provider_id, issuer, user_id, password)
        VALUES (${randomUUID()}, ${userId}, 'credential',
                ${createLocalAccountIssuer("credential")}, ${userId}, ${hash})`,
  );
  return userId;
}

async function storedHash(userId: string): Promise<string> {
  const rows = await db.execute<{ password: string }>(
    sql`SELECT password FROM "account" WHERE user_id = ${userId} AND provider_id = 'credential'`,
  );
  return rows.rows[0].password;
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE "user", "session", "account", "verification", "audit_logs" CASCADE`,
  );
});

describe("mots de passe hérités de BookList v1", () => {
  it("laisse se connecter un compte dont le mot de passe est encore en bcrypt", async () => {
    await seedLegacyUser();

    const res = await loginHandler(
      loginRequest({ email: EMAIL, password: PASSWORD, turnstileToken: "test-token" }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/better-auth\.session_token=/);
  });

  it("remplace le hash bcrypt par un hash scrypt dès la première connexion réussie", async () => {
    const userId = await seedLegacyUser();
    expect(isBcryptHash(await storedHash(userId))).toBe(true);

    await loginHandler(
      loginRequest({ email: EMAIL, password: PASSWORD, turnstileToken: "test-token" }),
    );

    expect(isBcryptHash(await storedHash(userId))).toBe(false);
  });

  it("reste connectable après la bascule vers scrypt", async () => {
    await seedLegacyUser();

    await loginHandler(
      loginRequest({ email: EMAIL, password: PASSWORD, turnstileToken: "test-token" }),
    );
    const res = await loginHandler(
      loginRequest({ email: EMAIL, password: PASSWORD, turnstileToken: "test-token" }),
    );

    expect(res.status).toBe(200);
  });

  it("refuse un mot de passe incorrect sur un compte encore en bcrypt", async () => {
    const userId = await seedLegacyUser();

    const res = await loginHandler(
      loginRequest({
        email: EMAIL,
        password: "mauvais-mot-de-passe",
        turnstileToken: "test-token",
      }),
    );

    expect(res.status).toBe(401);
    // Le hash ne doit surtout pas être touché par une tentative échouée.
    expect(isBcryptHash(await storedHash(userId))).toBe(true);
  });
});
