import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";
import { getReadingStats } from "@/lib/reading-stats";

async function createUser(): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (${id}, 'Lectrice', ${`${id}@booklist.fr`}, true, 'user')`,
  );
  return id;
}

async function addBook(
  userId: string,
  status: "TO_READ" | "READING" | "FINISHED" | "ABANDONED",
  pageCount: number,
  options: { currentPage?: number; endDate?: Date } = {},
) {
  await db.execute(
    sql`INSERT INTO "book" (id, title, author, user_id, status, page_count, current_page, user_end_date)
        VALUES (${randomUUID()}, ${`Livre ${status}`}, 'Auteur', ${userId}, ${status}, ${pageCount},
                ${options.currentPage ?? null}, ${options.endDate ?? null})`,
  );
}

beforeAll(async () => {
  await runMigrations();
});

describe("getReadingStats", () => {
  it("ne compte comme lus que les livres terminés, et ceux lus avant l'inscription", async () => {
    const userId = await createUser();
    const thisYear = new Date();
    await addBook(userId, "FINISHED", 300, { endDate: thisYear });
    await addBook(userId, "FINISHED", 200);
    await addBook(userId, "TO_READ", 500);
    await addBook(userId, "READING", 400, { currentPage: 120 });
    await addBook(userId, "ABANDONED", 600, { currentPage: 50, endDate: thisYear });

    const stats = await getReadingStats(userId, 3);

    expect(stats.totalBooks).toBe(2 + 3);
    // 300 + 200 pour les livres terminés, puis la page atteinte dans les autres.
    expect(stats.totalPagesRead).toBe(300 + 200 + 120 + 50);
    expect(stats.booksThisYear).toBe(1);
  });
});
