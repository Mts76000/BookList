import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { runMigrations } from "@/drizzle/migrate";
import type { CatalogEntry } from "@/lib/book-catalog";

const searchBooks = vi.fn();
const checkCover = vi.fn();

vi.mock("@/lib/book-search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/book-search")>()),
  searchBooks: (...args: unknown[]) => searchBooks(...args),
}));
vi.mock("@/lib/cover-check", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cover-check")>();
  return {
    ...actual,
    checkCover: (url: string) => checkCover(url),
    firstValidCover: async (urls: (string | null)[]) => {
      for (const url of urls) if (url && (await checkCover(url)) === "valid") return url;
      return null;
    },
  };
});

const { enrichLibrary } = await import("@/lib/library-enrichment");

const DUNE: CatalogEntry = {
  id: "vol-dune",
  isbn: "9782266320481",
  title: "Dune",
  subtitle: null,
  authors: ["Frank Herbert"],
  description: "Sur Arrakis, la planète des sables...",
  coverUrl: "https://catalogue.bnf.fr/couverture?idArk=dune",
  pageCount: 828,
  publishedDate: "2021",
  genres: ["Science-fiction"],
};

const LONG_AGO = new Date("2020-01-01T00:00:00Z");

async function createUser(): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (${id}, 'Lecteur', ${`${id}@booklist.fr`}, true, 'user')`,
  );
  return id;
}

async function createBook(userId: string, fields: Partial<typeof book.$inferInsert> = {}) {
  const [row] = await db
    .insert(book)
    .values({ title: "Dune", author: "Frank Herbert", userId, updatedAt: LONG_AGO, ...fields })
    .returning({ id: book.id });
  return row.id;
}

async function findBook(id: string) {
  const [row] = await db.select().from(book).where(eq(book.id, id));
  return row;
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(() => {
  searchBooks.mockReset().mockResolvedValue({ books: [DUNE], unavailable: null });
  checkCover.mockReset().mockResolvedValue("valid");
});

afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE "user", "book" CASCADE`);
});

describe("enrichissement de la bibliothèque", () => {
  it("complète un livre importé sans couverture ni pages, sans toucher à updatedAt", async () => {
    const userId = await createUser();
    const id = await createBook(userId, { isbn: "9782266320481" });

    expect(await enrichLibrary({ userId })).toEqual({ checked: 1, updated: 1 });

    const row = await findBook(id);
    expect(row).toMatchObject({
      coverUrl: DUNE.coverUrl,
      pageCount: 828,
      description: DUNE.description,
      publishedDate: "2021",
      genre: "Science-fiction",
      updatedAt: LONG_AGO,
    });
    expect(row.metadataCheckedAt).not.toBeNull();
    expect(searchBooks).toHaveBeenCalledWith({ isbn: "9782266320481" });
  });

  it("n'écrase jamais une valeur saisie, sauf une couverture qui n'existe plus", async () => {
    const userId = await createUser();
    const id = await createBook(userId, {
      isbn: "9782266320481",
      pageCount: 900,
      description: "Mon résumé",
      coverUrl: "https://covers.openlibrary.org/b/id/404-L.jpg",
    });
    checkCover.mockImplementation(async (url: string) =>
      url.includes("404") ? "invalid" : "valid",
    );

    await enrichLibrary({ userId });

    expect(await findBook(id)).toMatchObject({
      pageCount: 900,
      description: "Mon résumé",
      coverUrl: DUNE.coverUrl,
    });
  });

  it("garde une couverture que sa source n'a pas pu confirmer", async () => {
    const userId = await createUser();
    const cover = "https://books.google.com/books/content?id=x";
    const id = await createBook(userId, { isbn: "9782266320481", coverUrl: cover });
    checkCover.mockImplementation(async (url: string) => (url === cover ? "unknown" : "valid"));

    await enrichLibrary({ userId });

    expect((await findBook(id)).coverUrl).toBe(cover);
  });

  it("retrouve un livre sans ISBN par son titre et son auteur", async () => {
    const userId = await createUser();
    const id = await createBook(userId);
    searchBooks.mockResolvedValue({
      books: [{ ...DUNE, id: "other", title: "Dune Messiah" }, DUNE],
      unavailable: null,
    });

    await enrichLibrary({ userId });

    expect(searchBooks).toHaveBeenCalledWith({ q: "Dune Frank Herbert" });
    expect((await findBook(id)).pageCount).toBe(828);
  });

  it("retente demain un livre que les sources n'ont pas pu traiter", async () => {
    const userId = await createUser();
    const id = await createBook(userId, { isbn: "9782266320481" });
    searchBooks.mockResolvedValue({ books: [], unavailable: "API_LIMIT_EXCEEDED" });

    expect(await enrichLibrary({ userId })).toEqual({ checked: 1, updated: 0 });
    expect((await findBook(id)).coverUrl).toBeNull();
    // Pas de nouvel essai dans la foulée.
    expect(await enrichLibrary({ userId })).toEqual({ checked: 0, updated: 0 });

    // Un jour plus tard, le livre redevient éligible.
    await db.execute(
      sql`UPDATE "book" SET metadata_checked_at = metadata_checked_at - interval '25 hours'`,
    );
    expect((await enrichLibrary({ userId })).checked).toBe(1);
  });

  it("ne vérifie qu'une fois un livre complet, sans interroger les sources", async () => {
    const userId = await createUser();
    await createBook(userId, {
      isbn: "9782266320481",
      coverUrl: DUNE.coverUrl,
      pageCount: 828,
      description: "Résumé",
    });

    expect(await enrichLibrary({ userId })).toEqual({ checked: 1, updated: 0 });
    expect(await enrichLibrary({ userId })).toEqual({ checked: 0, updated: 0 });
    expect(searchBooks).not.toHaveBeenCalled();
  });
});
