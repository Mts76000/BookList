import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";

const currentUser = { id: "", email: "lecteur@booklist.fr" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: async () => ({ user: currentUser }) };
});

const { POST: updateProgress } = await import("@/app/api/books/[id]/progress/route");
const { GET: exportBooks } = await import("@/app/api/books/export/route");
const { POST: importBooks } = await import("@/app/api/books/import/route");

let ipCounter = 0;
function request(url: string, method: string, body?: unknown) {
  ipCounter += 1;
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.0.12.${ipCounter % 250}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function createUser(): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role, premium_until)
        VALUES (${id}, 'Lecteur', ${`${id}@booklist.fr`}, true, 'user', now() + interval '1 day')`,
  );
  currentUser.id = id;
  return id;
}

async function pagesToday(userId: string): Promise<number> {
  const rows = await db.execute<{ pages_read: number }>(
    sql`SELECT pages_read FROM "reading_activity" WHERE user_id = ${userId}`,
  );
  return rows.rows[0]?.pages_read ?? 0;
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE "user", "book", "reading_activity" CASCADE`);
});

describe("progression de lecture", () => {
  it("ajoute les pages gagnées à la journée et passe le livre en cours", async () => {
    const userId = await createUser();
    const bookId = randomUUID();
    await db.execute(
      sql`INSERT INTO "book" (id, title, author, user_id, status, page_count)
          VALUES (${bookId}, 'Dune', 'Herbert', ${userId}, 'TO_READ', 300)`,
    );

    const first = await updateProgress(
      request("http://localhost/api", "POST", { currentPage: 40 }),
      context(bookId),
    );
    expect((await first.json()).data).toMatchObject({ pagesLogged: 40, reachedEnd: false });

    await updateProgress(
      request("http://localhost/api", "POST", { currentPage: 65 }),
      context(bookId),
    );
    expect(await pagesToday(userId)).toBe(65);

    const rows = await db.execute<{ status: string; current_page: number }>(
      sql`SELECT status, current_page FROM "book" WHERE id = ${bookId}`,
    );
    expect(rows.rows[0]).toEqual({ status: "READING", current_page: 65 });
  });

  it("borne la page au nombre de pages et signale la fin", async () => {
    const userId = await createUser();
    const bookId = randomUUID();
    await db.execute(
      sql`INSERT INTO "book" (id, title, author, user_id, status, page_count, current_page)
          VALUES (${bookId}, 'Court', 'Auteur', ${userId}, 'READING', 100, 90)`,
    );

    const res = await updateProgress(
      request("http://localhost/api", "POST", { currentPage: 250 }),
      context(bookId),
    );
    expect((await res.json()).data).toEqual({
      currentPage: 100,
      pagesLogged: 10,
      reachedEnd: true,
    });
  });

  it("corrige un retour en arrière sans retirer de pages à la journée", async () => {
    const userId = await createUser();
    const bookId = randomUUID();
    await db.execute(
      sql`INSERT INTO "book" (id, title, author, user_id, status, current_page)
          VALUES (${bookId}, 'Livre', 'Auteur', ${userId}, 'READING', 120)`,
    );
    const res = await updateProgress(
      request("http://localhost/api", "POST", { currentPage: 80 }),
      context(bookId),
    );
    expect((await res.json()).data.pagesLogged).toBe(0);
    expect(await pagesToday(userId)).toBe(0);
  });

  it("refuse le livre d'un autre utilisateur", async () => {
    const ownerId = await createUser();
    const bookId = randomUUID();
    await db.execute(
      sql`INSERT INTO "book" (id, title, author, user_id) VALUES (${bookId}, 'X', 'Y', ${ownerId})`,
    );
    await createUser();
    const res = await updateProgress(
      request("http://localhost/api", "POST", { currentPage: 10 }),
      context(bookId),
    );
    expect(res.status).toBe(404);
  });
});

describe("export CSV", () => {
  it("se réimporte à l'identique dans un autre compte", async () => {
    const userId = await createUser();
    await db.execute(
      sql`INSERT INTO "book" (id, title, author, isbn, user_id, status, user_rating, format, tags,
                              series_name, series_index, user_end_date)
          VALUES (${randomUUID()}, 'Le "Grand" Meaulnes', 'Alain-Fournier', '9782070361908',
                  ${userId}, 'FINISHED', 5, 'paper', '{Favoris,Prêtés}', 'Aucune', 1,
                  '2024-02-10')`,
    );

    const res = await exportBooks(request("http://localhost/api/books/export", "GET"));
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();

    const otherId = await createUser();
    const imported = await importBooks(
      request("http://localhost/api/books/import", "POST", { csv }),
    );
    expect((await imported.json()).data.imported).toBe(1);

    const rows = await db.execute(
      sql`SELECT title, isbn, status, user_rating, format, tags, series_name, series_index
          FROM "book" WHERE user_id = ${otherId}`,
    );
    expect(rows.rows[0]).toEqual({
      title: 'Le "Grand" Meaulnes',
      isbn: "9782070361908",
      status: "FINISHED",
      user_rating: 5,
      format: "paper",
      tags: ["Favoris", "Prêtés"],
      series_name: "Aucune",
      series_index: 1,
    });
  });
});
