import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";

const currentUser = { id: "", email: "lectrice@booklist.fr" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: async () => ({ user: currentUser }) };
});

const { POST: addQuote } = await import("@/app/api/books/[id]/quotes/route");
const { DELETE: deleteQuote } = await import("@/app/api/quotes/[id]/route");
const { POST: createChallenge } = await import("@/app/api/challenges/route");
const { DELETE: deleteChallenge } = await import("@/app/api/challenges/[id]/route");

let ipCounter = 0;
function request(url: string, method: string, body?: unknown) {
  ipCounter += 1;
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.0.11.${ipCounter % 250}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function createUser(premium = false): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role, premium_until)
        VALUES (${id}, 'Lectrice', ${`${id}@booklist.fr`}, true, 'user',
                ${premium ? new Date(Date.now() + 86_400_000) : null})`,
  );
  currentUser.id = id;
  return id;
}

async function createBook(userId: string): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "book" (id, title, author, user_id) VALUES (${id}, 'Livre', 'Auteur', ${userId})`,
  );
  return id;
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE "user", "book", "quote", "reading_challenge" CASCADE`);
});

describe("citations", () => {
  it("n'impose pas de limite de citations, même à un compte gratuit", async () => {
    const userId = await createUser();
    const bookId = await createBook(userId);
    for (let i = 0; i < 8; i++) {
      const res = await addQuote(
        request("http://localhost/api", "POST", { content: `Passage ${i}`, page: i }),
        context(bookId),
      );
      expect(res.status).toBe(201);
    }
  });

  it("refuse une citation sur le livre d'un autre et la suppression de celle d'un autre", async () => {
    const ownerId = await createUser();
    const bookId = await createBook(ownerId);
    const created = await addQuote(
      request("http://localhost/api", "POST", { content: "À moi" }),
      context(bookId),
    );
    const quoteId = (await created.json()).data.id;

    await createUser();
    const add = await addQuote(
      request("http://localhost/api", "POST", { content: "Intrus" }),
      context(bookId),
    );
    expect(add.status).toBe(404);
    const del = await deleteQuote(request("http://localhost/api", "DELETE"), context(quoteId));
    expect(del.status).toBe(404);
  });
});

describe("défis personnels", () => {
  it("sont réservés à Premium", async () => {
    await createUser();
    const res = await createChallenge(
      request("http://localhost/api", "POST", { title: "Pavés", kind: "long_books", target: 3 }),
    );
    expect(res.status).toBe(403);
  });

  it("se créent et se suppriment pour un compte Premium", async () => {
    await createUser(true);
    const res = await createChallenge(
      request("http://localhost/api", "POST", {
        title: "Tout Christie",
        kind: "author",
        target: 10,
        filter: "Christie",
      }),
    );
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({
      kind: "author",
      filter: "Christie",
      year: new Date().getFullYear(),
    });

    const del = await deleteChallenge(request("http://localhost/api", "DELETE"), context(data.id));
    expect(del.status).toBe(200);
  });

  it("exigent un filtre pour un défi de genre", async () => {
    await createUser(true);
    const res = await createChallenge(
      request("http://localhost/api", "POST", { title: "Polars", kind: "genre", target: 5 }),
    );
    expect(res.status).toBe(400);
  });
});
