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

/** En-tête PNG d'une image aux dimensions données : assez pour la vérification de couverture. */
function pngResponse(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Response(bytes, { headers: { "content-type": "image/png" } });
}

/**
 * Faux services distants : Google Books renvoie `items` (ou le statut donné), Open Library
 * et la BnF ne connaissent rien sauf mention contraire (`others`). Toute image demandée
 * existe, sauf celles dont l'URL contient l'un des `missingCovers`.
 */
const fetchMock = vi.fn<typeof fetch>();

function googleReplies(
  reply: { items?: unknown[] } | number,
  others: { bnf?: string; openLibrary?: unknown; missingCovers?: string[] } = {},
) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    const isImage =
      /\.jpg|\/books\/content|\/couverture/.test(url) && !url.includes("googleapis.com");
    if (isImage) {
      return others.missingCovers?.some((part) => url.includes(part))
        ? new Response(null, { status: 404 })
        : pngResponse(400, 600);
    }
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
    books: {
      id: string;
      title: string;
      authors: string[];
      pageCount: number | null;
      coverUrl: string | null;
    }[];
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

  it("écarte une couverture absente au profit de la couverture BnF de l'édition", async () => {
    googleReplies(
      { items: [DUNE] },
      {
        bnf: BNF_DUNE.replace(
          "</oai_dc:dc>",
          "<dc:identifier>http://catalogue.bnf.fr/ark:/12148/cb47290539v</dc:identifier></oai_dc:dc>",
        ),
        missingCovers: ["dune.jpg"],
      },
    );

    const { books } = await search({ isbn: "9782266320481" });

    expect(books[0].coverUrl).toBe(
      "https://catalogue.bnf.fr/couverture?appName=NE&idArk=ark%3A%2F12148%2Fcb47290539v&couverture=1",
    );
  });

  it("se rabat sur la couverture Google par ISBN, sans quota", async () => {
    googleReplies(429, { bnf: BNF_DUNE });

    const { books } = await search({ isbn: "9782266320481" });

    expect(books[0]).toMatchObject({
      pageCount: 828,
      coverUrl:
        "https://books.google.com/books/content?vid=ISBN9782266320481&printsec=frontcover&img=1&zoom=1",
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
