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
    imageLinks: { thumbnail: "http://books.google.com/dune.jpg&edge=curl" },
    industryIdentifiers: [{ type: "ISBN_13", identifier: "9782266320481" }],
  },
};

/** Notice BnF minimale (Dublin Core), pour le nombre de pages de l'édition imprimée. */
const BNF_DUNE = `<srw:searchRetrieveResponse><oai_dc:dc>
  <dc:title>Dune / Frank Herbert ; traduit de l'américain par Michel Demuth</dc:title>
  <dc:creator>Herbert, Frank (1920-1986). Auteur du texte</dc:creator>
  <dc:format>1 vol. (828 p.) ; 18 cm</dc:format>
</oai_dc:dc></srw:searchRetrieveResponse>`;

/**
 * Faux services distants : Google Books renvoie `items` (ou le statut donné), Open Library
 * et la BnF ne connaissent rien sauf mention contraire (`others`).
 */
const fetchMock = vi.fn<typeof fetch>();

function googleReplies(
  reply: { items?: unknown[] } | number,
  others: { bnf?: string; openLibrary?: unknown } = {},
) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("catalogue.bnf.fr")) {
      return new Response(others.bnf ?? "<srw:searchRetrieveResponse/>");
    }
    if (url.includes("openlibrary.org/api/books")) return Response.json(others.openLibrary ?? {});
    if (url.includes("openlibrary.org")) return Response.json({ docs: [] });
    return typeof reply === "number"
      ? new Response("{}", { status: reply })
      : Response.json({ items: reply.items });
  });
}

/** Appels faits à Google Books, le seul service à quota. */
function googleCalls() {
  return fetchMock.mock.calls.filter(([input]) => String(input).includes("googleapis.com")).length;
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
  return body.data as {
    books: { id: string; title: string; authors: string[]; pageCount: number | null }[];
    unavailable: string | null;
  };
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
    expect(googleCalls()).toBe(1);
  });

  it("croise les sources pour un ISBN : pages de la BnF, couverture Open Library", async () => {
    const withoutCover = {
      ...DUNE,
      volumeInfo: { ...DUNE.volumeInfo, imageLinks: undefined },
    };
    googleReplies(
      { items: [withoutCover] },
      {
        bnf: BNF_DUNE,
        openLibrary: {
          "ISBN:9782266320481": {
            title: "Dune",
            authors: [{ name: "Frank Herbert" }],
            cover: { large: "https://covers.openlibrary.org/b/id/1-L.jpg" },
          },
        },
      },
    );

    const { books } = await search({ isbn: "2266320483" });

    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      id: "vol-dune",
      isbn: "9782266320481",
      pageCount: 828,
      coverUrl: "https://covers.openlibrary.org/b/id/1-L.jpg",
    });
  });

  it("trouve par ISBN un livre que Google ne connaît pas", async () => {
    googleReplies({ items: [] }, { bnf: BNF_DUNE });

    const { books } = await search({ isbn: "9782266320481" });

    expect(books.map((b) => [b.title, b.authors, b.pageCount])).toEqual([
      ["Dune", ["Frank Herbert"], 828],
    ]);
  });

  it("partage le cache entre deux saisies équivalentes d'un même texte", async () => {
    googleReplies({ items: [DUNE] });

    await search({ q: "Dune" });
    const again = await search({ q: "  DUNE " });

    expect(again.books.map((b) => b.id)).toEqual(["vol-dune"]);
    expect(googleCalls()).toBe(1);
  });

  it("mémorise aussi un ISBN introuvable", async () => {
    googleReplies({ items: [] });

    await search({ isbn: "9780000000002" });
    // Premier scan : la recherche `isbn:` puis le repli en texte libre.
    expect(googleCalls()).toBe(2);

    const again = await search({ isbn: "9780000000002" });
    expect(again.books).toEqual([]);
    expect(again.unavailable).toBeNull();
    expect(googleCalls()).toBe(2);
  });

  it("ne met pas en cache un quota dépassé", async () => {
    googleReplies(429);

    const first = await search({ q: "Dune" });
    await search({ q: "Dune" });

    expect(first.unavailable).toBe("API_LIMIT_EXCEEDED");
    expect(googleCalls()).toBe(2);
  });

  it("relance Google une fois la recherche expirée", async () => {
    googleReplies({ items: [DUNE] });
    await search({ q: "Dune" });
    await db.execute(sql`UPDATE "catalog_search" SET expires_at = now() - interval '1 minute'`);

    await search({ q: "Dune" });

    expect(googleCalls()).toBe(2);
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
