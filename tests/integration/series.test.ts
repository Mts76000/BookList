import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { runMigrations } from "@/drizzle/migrate";

const currentUser = { id: "", email: "sagas@booklist.fr" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: async () => ({ user: currentUser }) };
});

const { PUT: saveSeries, DELETE: deleteSeries } = await import("@/app/api/series/route");
const { PATCH: updateBook } = await import("@/app/api/books/[id]/route");

let ipCounter = 0;

function request(method: string, body: unknown, url = "http://localhost:3000/api/series") {
  ipCounter += 1;
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      "x-forwarded-for": `10.0.7.${ipCounter % 250}`,
    },
    body: JSON.stringify(body),
  });
}

async function createUser(email: string): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (${id}, 'Lecteur', ${email}, true, 'user')`,
  );
  return id;
}

async function addBook(
  userId: string,
  title: string,
  series: { name: string; index: number } | null = null,
): Promise<string> {
  const [created] = await db
    .insert(book)
    .values({
      userId,
      title,
      author: "Frank Herbert",
      seriesName: series?.name ?? null,
      seriesIndex: series?.index ?? null,
    })
    .returning({ id: book.id });
  return created.id;
}

const seriesOf = (userId: string) =>
  db
    .select({
      title: book.title,
      seriesName: book.seriesName,
      seriesIndex: book.seriesIndex,
      seriesTotal: book.seriesTotal,
    })
    .from(book)
    .where(eq(book.userId, userId))
    .orderBy(asc(book.title));

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE "user", "book" CASCADE`);
});

describe("PUT /api/series", () => {
  it("crée une saga d'un coup, avec le numéro de chaque tome et le nombre de tomes", async () => {
    currentUser.id = await createUser(currentUser.email);
    const dune = await addBook(currentUser.id, "Dune");
    const messie = await addBook(currentUser.id, "Le Messie de Dune");

    const res = await saveSeries(
      request("PUT", {
        name: "Dune",
        total: 6,
        volumes: [
          { bookId: dune, seriesIndex: 1 },
          { bookId: messie, seriesIndex: 2 },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(await seriesOf(currentUser.id)).toEqual([
      { title: "Dune", seriesName: "Dune", seriesIndex: 1, seriesTotal: 6 },
      { title: "Le Messie de Dune", seriesName: "Dune", seriesIndex: 2, seriesTotal: 6 },
    ]);
  });

  it("rejoint une saga existante sous son orthographe au lieu d'en créer une seconde", async () => {
    currentUser.id = await createUser(currentUser.email);
    await addBook(currentUser.id, "Dune", { name: "Dune", index: 1 });
    const enfants = await addBook(currentUser.id, "Les Enfants de Dune");

    const res = await saveSeries(
      request("PUT", { name: "dune ", volumes: [{ bookId: enfants, seriesIndex: 3 }] }),
    );

    expect((await res.json()).data.name).toBe("Dune");
    const rows = await seriesOf(currentUser.id);
    expect(rows.map((row) => row.seriesName)).toEqual(["Dune", "Dune"]);
  });

  it("renomme une saga et en retire les livres absents de la liste", async () => {
    currentUser.id = await createUser(currentUser.email);
    const dune = await addBook(currentUser.id, "Dune", { name: "Dune", index: 1 });
    await addBook(currentUser.id, "Sapiens", { name: "Dune", index: 2 });

    await saveSeries(
      request("PUT", {
        name: "Le cycle de Dune",
        previousName: "Dune",
        volumes: [{ bookId: dune, seriesIndex: 1 }],
      }),
    );

    expect(await seriesOf(currentUser.id)).toEqual([
      { title: "Dune", seriesName: "Le cycle de Dune", seriesIndex: 1, seriesTotal: null },
      { title: "Sapiens", seriesName: null, seriesIndex: null, seriesTotal: null },
    ]);
  });

  it("refuse les livres d'un autre utilisateur, sans rien modifier", async () => {
    currentUser.id = await createUser(currentUser.email);
    const mine = await addBook(currentUser.id, "Dune");
    const otherUser = await createUser("autre@booklist.fr");
    const theirs = await addBook(otherUser, "Livre privé");

    const res = await saveSeries(
      request("PUT", {
        name: "Dune",
        volumes: [
          { bookId: mine, seriesIndex: 1 },
          { bookId: theirs, seriesIndex: 2 },
        ],
      }),
    );

    expect(res.status).toBe(404);
    expect((await seriesOf(currentUser.id))[0].seriesName).toBeNull();
    expect((await seriesOf(otherUser))[0].seriesName).toBeNull();
  });

  it("refuse une saga sans nom ou sans livre", async () => {
    currentUser.id = await createUser(currentUser.email);
    const res = await saveSeries(request("PUT", { name: "", volumes: [] }));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/series", () => {
  it("défait la saga en gardant ses livres", async () => {
    currentUser.id = await createUser(currentUser.email);
    await addBook(currentUser.id, "Dune", { name: "Dune", index: 1 });

    const res = await deleteSeries(request("DELETE", { name: "DUNE" }));

    expect(res.status).toBe(200);
    expect(await seriesOf(currentUser.id)).toEqual([
      { title: "Dune", seriesName: null, seriesIndex: null, seriesTotal: null },
    ]);
  });
});

describe("PATCH /api/books/[id]", () => {
  it("range un livre dans une saga existante sous son orthographe", async () => {
    currentUser.id = await createUser(currentUser.email);
    await addBook(currentUser.id, "Dune", { name: "Dune", index: 1 });
    const messie = await addBook(currentUser.id, "Le Messie de Dune");

    await updateBook(
      request(
        "PATCH",
        { seriesName: "DUNE", seriesIndex: 2 },
        `http://localhost:3000/api/books/${messie}`,
      ),
      { params: Promise.resolve({ id: messie }) },
    );

    expect((await seriesOf(currentUser.id)).map((row) => row.seriesName)).toEqual(["Dune", "Dune"]);
  });
});
