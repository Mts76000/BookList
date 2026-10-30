import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { runMigrations } from "@/drizzle/migrate";

const currentUser = { id: "", email: "collection@booklist.fr" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: async () => ({ user: currentUser }) };
});

const { POST: findEditions } = await import("@/app/api/series/editions/route");

/**
 * Réponse d'Open Library pour « Harry Potter et le prisonnier d'Azkaban » : l'œuvre est
 * rangée sous son titre anglais, avec deux éditions françaises de collections différentes.
 */
const openLibraryResponse = {
  docs: [
    {
      key: "/works/OL82586W",
      author_name: ["J. K. Rowling"],
      editions: {
        docs: [
          {
            title: "Harry Potter et le prisonnier d'Azkaban",
            isbn: ["9782070541300", "2070541304"],
            cover_i: 111,
          },
          {
            title: "Harry Potter et le prisonnier d'Azkaban",
            isbn: ["9782070584925"],
            cover_i: 222,
          },
        ],
      },
    },
  ],
};

let ipCounter = 0;
function request(body: unknown) {
  ipCounter += 1;
  return new Request("http://localhost:3000/api/series/editions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.11.${ipCounter}` },
    body: JSON.stringify(body),
  });
}

async function createUser(premium: boolean): Promise<string> {
  const id = randomUUID();
  const grantedUntil = premium ? new Date(Date.now() + 86_400_000) : null;
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role, premium_granted_until)
        VALUES (${id}, 'Lecteur', ${currentUser.email}, true, 'user', ${grantedUntil})`,
  );
  currentUser.id = id;
  return id;
}

/** Google Books à court de quota, Open Library disponible. */
function mockServices() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("googleapis.com")) return new Response("{}", { status: 429 });
    return new Response(JSON.stringify(openLibraryResponse), { status: 200 });
  });
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.execute(sql`TRUNCATE TABLE "user", "book", "catalog_search", "catalog_book" CASCADE`);
});

describe("POST /api/series/editions", () => {
  it("choisit l'édition de la collection du tome possédé, avec sa couverture", async () => {
    const userId = await createUser(true);
    // Tome 1 en Folio Junior : le tome 3 doit venir de la même collection.
    const [reference] = await db
      .insert(book)
      .values({
        userId,
        title: "Harry Potter à l'école des sorciers",
        author: "J. K. Rowling",
        isbn: "9782070584628",
      })
      .returning({ id: book.id });
    const fetchSpy = mockServices();

    const body = {
      titles: ["Harry Potter et le Prisonnier d'Azkaban"],
      author: "J. K. Rowling",
      referenceBookIds: [reference.id],
    };
    const { data } = await (await findEditions(request(body))).json();

    expect(data.editions[0]).toMatchObject({
      isbn: "9782070584925",
      coverUrl: "https://covers.openlibrary.org/b/id/222-L.jpg",
    });

    // Le choix est mis en cache : une deuxième demande n'appelle plus aucun service.
    const calls = fetchSpy.mock.calls.length;
    await findEditions(request(body));
    expect(fetchSpy.mock.calls.length).toBe(calls);
  });

  it("préfère une édition française sans tome de référence", async () => {
    await createUser(true);
    mockServices();

    const { data } = await (
      await findEditions(
        request({ titles: ["Harry Potter et le Prisonnier d'Azkaban"], author: "J. K. Rowling" }),
      )
    ).json();

    expect(data.editions[0].isbn).toMatch(/^9782/);
  });

  it("est ouverte aux comptes gratuits", async () => {
    await createUser(false);
    mockServices();
    const res = await findEditions(request({ titles: ["Dune"], author: "Frank Herbert" }));
    expect(res.status).toBe(200);
  });
});
