import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";
import { purgeExpiredSearches, searchCacheKey } from "@/lib/book-catalog";

const currentUser = { id: "catalog-user", email: "lecteur@booklist.fr" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: async () => ({ user: currentUser }) };
});

const { GET: searchBooks } = await import("@/app/api/books/search/route");

const DUNE = {
  id: "vol-dune",
  volumeInfo: {
    title: "Dune",
    authors: ["Frank Herbert"],
    pageCount: 890,
    industryIdentifiers: [{ type: "ISBN_13", identifier: "9782266320481" }],
  },
};

/** Faux Google Books : renvoie `items` pour chaque appel, ou le statut donné. */
const fetchMock = vi.fn<typeof fetch>();

function googleReplies(reply: { items?: unknown[] } | number) {
  fetchMock.mockImplementation(async () =>
    typeof reply === "number"
      ? new Response("{}", { status: reply })
      : Response.json({ items: reply.items }),
  );
}

let ipCounter = 0;

async function search(params: Record<string, string>) {
  ipCounter += 1;
  const res = await searchBooks(
    new Request(`http://localhost:3000/api/books/search?${new URLSearchParams(params)}`, {
      headers: { "x-forwarded-for": `10.0.7.${ipCounter % 250}` },
    }),
  );
  const body = await res.json();
  return body.data as { books: { id: string; title: string }[]; unavailable: string | null };
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await db.execute(sql`TRUNCATE TABLE "catalog_book", "catalog_search"`);
});

describe("GET /api/books/search — catalogue partagé", () => {
  it("ne rappelle pas Google pour un ISBN déjà au catalogue", async () => {
    googleReplies({ items: [DUNE] });

    const first = await search({ isbn: "978-2266320481" });
    const second = await search({ isbn: "9782266320481" });

    expect(first.books.map((b) => b.title)).toEqual(["Dune"]);
    expect(second.books.map((b) => b.title)).toEqual(["Dune"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retrouve par ISBN un livre entré au catalogue par une recherche texte", async () => {
    googleReplies({ items: [DUNE] });

    await search({ q: "dune herbert" });
    const byIsbn = await search({ isbn: "9782266320481" });

    expect(byIsbn.books.map((b) => b.id)).toEqual(["vol-dune"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("partage le cache entre deux saisies équivalentes d'un même texte", async () => {
    googleReplies({ items: [DUNE] });

    await search({ q: "Dune" });
    const again = await search({ q: "  DUNE " });

    expect(again.books.map((b) => b.id)).toEqual(["vol-dune"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mémorise aussi un ISBN introuvable", async () => {
    googleReplies({ items: [] });

    await search({ isbn: "9780000000002" });
    // Premier scan : la recherche `isbn:` puis le repli en texte libre.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const again = await search({ isbn: "9780000000002" });
    expect(again.books).toEqual([]);
    expect(again.unavailable).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ne met pas en cache un quota dépassé", async () => {
    googleReplies(429);

    const first = await search({ q: "Dune" });
    await search({ q: "Dune" });

    expect(first.unavailable).toBe("API_LIMIT_EXCEEDED");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("relance Google une fois la recherche expirée", async () => {
    googleReplies({ items: [DUNE] });
    await search({ q: "Dune" });
    await db.execute(sql`UPDATE "catalog_search" SET expires_at = now() - interval '1 minute'`);

    await search({ q: "Dune" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("purgeExpiredSearches", () => {
  it("ne supprime que les recherches expirées", async () => {
    await db.execute(
      sql`INSERT INTO "catalog_search" (query, book_ids, expires_at) VALUES
        (${searchCacheKey({ q: "ancienne" })}, '{}', now() - interval '1 day'),
        (${searchCacheKey({ q: "récente" })}, '{}', now() + interval '1 day')`,
    );

    expect(await purgeExpiredSearches()).toBe(1);

    const remaining = await db.execute(sql`SELECT query FROM "catalog_search"`);
    expect(remaining.rows).toEqual([{ query: "q:récente" }]);
  });
});
