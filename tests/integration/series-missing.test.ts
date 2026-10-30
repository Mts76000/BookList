import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { runMigrations } from "@/drizzle/migrate";

const currentUser = { id: "", email: "sorcier@booklist.fr" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: async () => ({ user: currentUser }) };
});

const { GET: getMissing } = await import("@/app/api/series/missing/route");

/** Réponse réelle de Wikidata pour Harry Potter (voir tests/fixtures). */
const wikidataResponse = readFileSync(
  join(__dirname, "../fixtures/wikidata-harry-potter.json"),
  "utf8",
);

let ipCounter = 0;
function request(name: string) {
  ipCounter += 1;
  return new Request(`http://localhost:3000/api/series/missing?name=${encodeURIComponent(name)}`, {
    headers: { "x-forwarded-for": `10.0.9.${ipCounter % 250}` },
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

async function addHarryPotter(userId: string) {
  await db.insert(book).values([
    {
      userId,
      title: "Harry Potter à l'école des sorciers",
      author: "J. K. Rowling",
      seriesName: "Harry Potter",
      seriesIndex: 1,
    },
    {
      userId,
      title: "Harry Potter et la Chambre des secrets",
      author: "J. K. Rowling",
      seriesName: "Harry Potter",
      seriesIndex: 2,
    },
  ]);
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await db.execute(sql`TRUNCATE TABLE "user", "book", "series_catalog", "series_lookup" CASCADE`);
});

describe("GET /api/series/missing", () => {
  it("liste les tomes manquants pour Premium, et n'interroge Wikidata qu'une fois", async () => {
    await addHarryPotter(await createUser(true));
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(wikidataResponse, { status: 200 }));

    const res = await getMissing(request("Harry Potter"));
    const { data } = await res.json();

    expect(data).toMatchObject({ found: true, total: 7, missingCount: 5, author: "J. K. Rowling" });
    expect(data.missing.map((volume: { index: number }) => volume.index)).toEqual([3, 4, 5, 6, 7]);
    expect(data.missing[0].title).toBe("Harry Potter et le Prisonnier d'Azkaban");

    // Deuxième visite : tout vient du cache partagé.
    const callsAfterFirstVisit = fetchSpy.mock.calls.length;
    await getMissing(request("Harry Potter"));
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirstVisit);
  });

  it("ne donne que le nombre de tomes manquants à un compte gratuit", async () => {
    await addHarryPotter(await createUser(false));
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(wikidataResponse, { status: 200 }),
    );

    const { data } = await (await getMissing(request("harry potter"))).json();

    expect(data).toMatchObject({ found: true, total: 7, missingCount: 5, missing: [] });
  });

  it("répond sans erreur quand Wikidata est indisponible, sans mettre l'échec en cache", async () => {
    await addHarryPotter(await createUser(true));
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response("indisponible", { status: 503 }),
    );

    const res = await getMissing(request("Harry Potter"));

    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ found: false });
    const cached = await db.execute(sql`SELECT count(*)::int AS n FROM "series_lookup"`);
    expect(cached.rows[0]).toEqual({ n: 0 });
  });

  it("refuse une saga absente de la bibliothèque", async () => {
    await createUser(true);
    const res = await getMissing(request("Inconnue"));
    expect(res.status).toBe(404);
  });
});
