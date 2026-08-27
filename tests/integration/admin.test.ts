import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";

const currentAdmin = { id: "", email: "admin@booklist.fr", role: "admin" };

// requireRole() s'appuie sur le cookie de session : on court-circuite l'identification pour
// tester les garde-fous du back-office eux-mêmes.
vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return {
    ...actual,
    requireAuth: async () => ({ user: currentAdmin }),
    requireRole: async (role: "admin") => {
      if (currentAdmin.role !== role) throw new actual.ForbiddenError();
      return { user: currentAdmin };
    },
  };
});

const { PATCH: updateUser, DELETE: deleteUser } = await import("@/app/api/admin/users/[id]/route");
const { DELETE: revokeSessions } = await import("@/app/api/admin/users/[id]/sessions/route");

function request(method: string, body?: unknown) {
  return new Request("http://localhost:3000/api/admin/users/x", {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.4.1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function createUser(email: string, role = "user"): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (${id}, 'Utilisateur', ${email}, true, ${role})`,
  );
  return id;
}

async function roleOf(id: string): Promise<string> {
  const rows = await db.execute<{ role: string }>(sql`SELECT role FROM "user" WHERE id = ${id}`);
  return rows.rows[0].role;
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE "user", "session", "account", "verification", "audit_logs", "book", "comment", "reading_activity" CASCADE`,
  );
  currentAdmin.role = "admin";
});

describe("PATCH /api/admin/users/[id]", () => {
  it("promeut un utilisateur administrateur et journalise l'action", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "admin");
    const targetId = await createUser("cible@booklist.fr");

    const res = await updateUser(request("PATCH", { role: "admin" }), routeContext(targetId));

    expect(res.status).toBe(200);
    expect(await roleOf(targetId)).toBe("admin");

    const logs = await db.execute<{ action: string }>(
      sql`SELECT action FROM "audit_logs" WHERE entity_id = ${targetId}`,
    );
    expect(logs.rows.map((r) => r.action)).toContain("admin.change_role");
  });

  it("empêche un administrateur de modifier son propre rôle", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "admin");

    const res = await updateUser(request("PATCH", { role: "user" }), routeContext(currentAdmin.id));

    expect(res.status).toBe(403);
    // Sans ce garde-fou, le dernier admin peut se verrouiller hors du back-office.
    expect(await roleOf(currentAdmin.id)).toBe("admin");
  });

  it("refuse un rôle inconnu", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "admin");
    const targetId = await createUser("cible@booklist.fr");

    const res = await updateUser(request("PATCH", { role: "superadmin" }), routeContext(targetId));

    expect(res.status).toBe(400);
    expect(await roleOf(targetId)).toBe("user");
  });

  it("refuse toute action à un utilisateur qui n'est pas administrateur", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "user");
    currentAdmin.role = "user";
    const targetId = await createUser("cible@booklist.fr");

    const res = await updateUser(request("PATCH", { role: "admin" }), routeContext(targetId));

    expect(res.status).toBe(403);
    expect(await roleOf(targetId)).toBe("user");
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  it("anonymise le compte ciblé", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "admin");
    const targetId = await createUser("cible@booklist.fr");

    const res = await deleteUser(request("DELETE"), routeContext(targetId));

    expect(res.status).toBe(200);
    const rows = await db.execute<{ is_anonymized: boolean; email: string }>(
      sql`SELECT is_anonymized, email FROM "user" WHERE id = ${targetId}`,
    );
    expect(rows.rows[0].is_anonymized).toBe(true);
    expect(rows.rows[0].email).not.toContain("cible@booklist.fr");
  });

  it("empêche un administrateur de supprimer son propre compte depuis l'admin", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "admin");

    const res = await deleteUser(request("DELETE"), routeContext(currentAdmin.id));

    expect(res.status).toBe(403);
    const rows = await db.execute<{ is_anonymized: boolean }>(
      sql`SELECT is_anonymized FROM "user" WHERE id = ${currentAdmin.id}`,
    );
    expect(rows.rows[0].is_anonymized).toBe(false);
  });
});

describe("DELETE /api/admin/users/[id]/sessions", () => {
  it("révoque toutes les sessions de l'utilisateur ciblé", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "admin");
    const targetId = await createUser("cible@booklist.fr");
    await db.execute(
      sql`INSERT INTO "session" (id, expires_at, token, user_id)
          VALUES (${randomUUID()}, now() + interval '7 days', ${randomUUID()}, ${targetId})`,
    );

    const res = await revokeSessions(request("DELETE"), routeContext(targetId));

    expect(res.status).toBe(200);
    const rows = await db.execute(sql`SELECT id FROM "session" WHERE user_id = ${targetId}`);
    expect(rows.rows).toHaveLength(0);
  });

  it("empêche un administrateur de révoquer ses propres sessions depuis l'admin", async () => {
    currentAdmin.id = await createUser(currentAdmin.email, "admin");
    await db.execute(
      sql`INSERT INTO "session" (id, expires_at, token, user_id)
          VALUES (${randomUUID()}, now() + interval '7 days', ${randomUUID()}, ${currentAdmin.id})`,
    );

    const res = await revokeSessions(request("DELETE"), routeContext(currentAdmin.id));

    expect(res.status).toBe(403);
    const rows = await db.execute(sql`SELECT id FROM "session" WHERE user_id = ${currentAdmin.id}`);
    expect(rows.rows).toHaveLength(1);
  });
});
