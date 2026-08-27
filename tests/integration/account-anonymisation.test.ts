import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createLocalAccountIssuer } from "better-auth/db";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";

const currentUser = { id: "", email: "a-supprimer@booklist.fr" };

// requireAuth() lit un cookie de session via better-auth ; on court-circuite uniquement
// l'identification pour tester ce qui nous intéresse ici : l'effet de la suppression.
vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return {
    ...actual,
    requireAuth: async () => ({ user: currentUser }),
  };
});

const { DELETE: deleteAccountHandler } = await import("@/app/api/account/route");

function deleteRequest() {
  return new Request("http://localhost:3000/api/account", {
    method: "DELETE",
    headers: { origin: "http://localhost:3000", "x-forwarded-for": "10.0.2.1" },
  });
}

async function seedUserWithData(): Promise<string> {
  const userId = randomUUID();
  currentUser.id = userId;
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role, initial_books_read)
        VALUES (${userId}, 'À Supprimer', ${currentUser.email}, true, 'user', 12)`,
  );
  await db.execute(
    sql`INSERT INTO "account" (id, account_id, provider_id, issuer, user_id, password)
        VALUES (${randomUUID()}, ${userId}, 'credential',
                ${createLocalAccountIssuer("credential")}, ${userId}, 'un-hash')`,
  );
  const bookId = randomUUID();
  await db.execute(
    sql`INSERT INTO "book" (id, title, author, user_id)
        VALUES (${bookId}, 'Dune', 'Frank Herbert', ${userId})`,
  );
  await db.execute(
    sql`INSERT INTO "comment" (id, content, book_id, user_id)
        VALUES (${randomUUID()}, 'Excellent', ${bookId}, ${userId})`,
  );
  await db.execute(
    sql`INSERT INTO "reading_activity" (id, pages_read, date, user_id)
        VALUES (${randomUUID()}, 30, '2026-01-15', ${userId})`,
  );
  return userId;
}

async function countIn(table: string, userId: string): Promise<number> {
  const rows = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM ${sql.identifier(table)} WHERE user_id = ${userId}`,
  );
  return Number(rows.rows[0].count);
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE "user", "session", "account", "verification", "audit_logs", "book", "comment", "reading_activity" CASCADE`,
  );
});

describe("DELETE /api/account", () => {
  it("anonymise la ligne utilisateur au lieu de la supprimer", async () => {
    const userId = await seedUserWithData();

    const res = await deleteAccountHandler(deleteRequest());
    expect(res.status).toBe(200);

    const rows = await db.execute<{
      email: string;
      name: string;
      is_anonymized: boolean;
      anonymized_at: Date | null;
    }>(sql`SELECT email, name, is_anonymized, anonymized_at FROM "user" WHERE id = ${userId}`);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].is_anonymized).toBe(true);
    expect(rows.rows[0].anonymized_at).not.toBeNull();
    expect(rows.rows[0].email).toBe(`deleted-${userId}@anonymized.booklist`);
    expect(rows.rows[0].email).not.toContain("a-supprimer");
  });

  it("supprime réellement les données métier et les moyens de connexion", async () => {
    const userId = await seedUserWithData();

    await deleteAccountHandler(deleteRequest());

    expect(await countIn("book", userId)).toBe(0);
    expect(await countIn("comment", userId)).toBe(0);
    expect(await countIn("reading_activity", userId)).toBe(0);
    expect(await countIn("account", userId)).toBe(0);
  });

  it("conserve la trace d'audit de la suppression", async () => {
    const userId = await seedUserWithData();

    await deleteAccountHandler(deleteRequest());

    const rows = await db.execute<{ action: string }>(
      sql`SELECT action FROM "audit_logs" WHERE user_id = ${userId}`,
    );
    expect(rows.rows.map((r) => r.action)).toContain("user.delete_account");
  });

  it("refuse de supprimer deux fois le même compte", async () => {
    await seedUserWithData();

    await deleteAccountHandler(deleteRequest());
    const res = await deleteAccountHandler(deleteRequest());

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
  });
});
