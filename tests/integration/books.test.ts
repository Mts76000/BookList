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

const { POST: createBook, GET: listBooks } = await import("@/app/api/books/route");
const { PATCH: updateBook, DELETE: deleteBook } = await import("@/app/api/books/[id]/route");
const { POST: addComment } = await import("@/app/api/books/[id]/comments/route");
const { POST: recordActivity } = await import("@/app/api/reading-activity/route");
const { POST: importBooks } = await import("@/app/api/books/import/route");

let ipCounter = 0;

function request(url: string, method: string, body?: unknown) {
  ipCounter += 1;
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      "x-forwarded-for": `10.0.3.${ipCounter % 250}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function createUser(email: string): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (${id}, 'Lecteur', ${email}, true, 'user')`,
  );
  return id;
}

/** Insère un livre appartenant à quelqu'un d'autre que l'utilisateur courant. */
async function seedForeignBook(): Promise<string> {
  const otherUserId = await createUser("autre@booklist.fr");
  const bookId = randomUUID();
  await db.execute(
    sql`INSERT INTO "book" (id, title, author, user_id)
        VALUES (${bookId}, 'Livre privé', 'Autre Auteur', ${otherUserId})`,
  );
  return bookId;
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE "user", "session", "account", "verification", "audit_logs", "book", "comment", "reading_activity" CASCADE`,
  );
});

describe("POST /api/books", () => {
  it("crée un livre et le rattache à l'utilisateur courant", async () => {
    currentUser.id = await createUser(currentUser.email);

    const res = await createBook(
      request("http://localhost:3000/api/books", "POST", {
        title: "Dune",
        author: "Frank Herbert",
        pageCount: "890",
        userRating: "5",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Dune");
    // Le CSV et les formulaires envoient des chaînes : le schéma doit les convertir.
    expect(body.data.pageCount).toBe(890);
    expect(body.data.userRating).toBe(5);
    expect(body.data.userId).toBe(currentUser.id);
  });

  it("refuse un livre sans titre", async () => {
    currentUser.id = await createUser(currentUser.email);

    const res = await createBook(
      request("http://localhost:3000/api/books", "POST", { title: "  ", author: "Quelqu'un" }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("renvoie le livre existant plutôt qu'un doublon quand l'ISBN est déjà en bibliothèque", async () => {
    currentUser.id = await createUser(currentUser.email);
    const payload = { title: "Dune", author: "Frank Herbert", isbn: "9782266320481" };

    const first = await createBook(request("http://localhost:3000/api/books", "POST", payload));
    const second = await createBook(request("http://localhost:3000/api/books", "POST", payload));

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect((await second.json()).data.id).toBe((await first.json()).data.id);

    const rows = await db.execute(sql`SELECT id FROM "book" WHERE user_id = ${currentUser.id}`);
    expect(rows.rows).toHaveLength(1);
  });

  it("réécrit une couverture en http vers https", async () => {
    currentUser.id = await createUser(currentUser.email);

    const res = await createBook(
      request("http://localhost:3000/api/books", "POST", {
        title: "Dune",
        author: "Frank Herbert",
        coverUrl: "http://covers.openlibrary.org/b/isbn/9782266320481-L.jpg",
      }),
    );

    expect((await res.json()).data.coverUrl).toMatch(/^https:/);
  });
});

describe("GET /api/books", () => {
  it("ne renvoie que les livres de l'utilisateur courant", async () => {
    currentUser.id = await createUser(currentUser.email);
    await seedForeignBook();
    await createBook(
      request("http://localhost:3000/api/books", "POST", { title: "À moi", author: "Moi" }),
    );

    const res = await listBooks(request("http://localhost:3000/api/books", "GET"));

    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe("PATCH et DELETE /api/books/[id]", () => {
  it("met à jour un livre de sa propre bibliothèque", async () => {
    currentUser.id = await createUser(currentUser.email);
    const created = await createBook(
      request("http://localhost:3000/api/books", "POST", { title: "Dune", author: "Herbert" }),
    );
    const { id } = (await created.json()).data;

    const res = await updateBook(
      request(`http://localhost:3000/api/books/${id}`, "PATCH", { status: "READING" }),
      routeContext(id),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("READING");
  });

  it("traite le livre d'un autre utilisateur comme introuvable, sans le modifier", async () => {
    currentUser.id = await createUser(currentUser.email);
    const foreignId = await seedForeignBook();

    const res = await updateBook(
      request(`http://localhost:3000/api/books/${foreignId}`, "PATCH", { title: "Détourné" }),
      routeContext(foreignId),
    );

    expect(res.status).toBe(404);
    const rows = await db.execute<{ title: string }>(
      sql`SELECT title FROM "book" WHERE id = ${foreignId}`,
    );
    expect(rows.rows[0].title).toBe("Livre privé");
  });

  it("refuse de supprimer le livre d'un autre utilisateur", async () => {
    currentUser.id = await createUser(currentUser.email);
    const foreignId = await seedForeignBook();

    const res = await deleteBook(
      request(`http://localhost:3000/api/books/${foreignId}`, "DELETE"),
      routeContext(foreignId),
    );

    expect(res.status).toBe(404);
    const rows = await db.execute(sql`SELECT id FROM "book" WHERE id = ${foreignId}`);
    expect(rows.rows).toHaveLength(1);
  });
});

describe("POST /api/books/[id]/comments", () => {
  it("refuse d'attacher une note au livre d'un autre utilisateur", async () => {
    currentUser.id = await createUser(currentUser.email);
    const foreignId = await seedForeignBook();

    const res = await addComment(
      request(`http://localhost:3000/api/books/${foreignId}/comments`, "POST", {
        content: "Intrusion",
      }),
      routeContext(foreignId),
    );

    expect(res.status).toBe(404);
    const rows = await db.execute(sql`SELECT id FROM "comment"`);
    expect(rows.rows).toHaveLength(0);
  });
});

describe("POST /api/reading-activity", () => {
  it("remplace la valeur du jour au lieu d'empiler les lignes", async () => {
    currentUser.id = await createUser(currentUser.email);
    const url = "http://localhost:3000/api/reading-activity";

    await recordActivity(request(url, "POST", { pagesRead: 30, date: "2026-02-10" }));
    await recordActivity(request(url, "POST", { pagesRead: 45, date: "2026-02-10" }));

    const rows = await db.execute<{ pages_read: number }>(
      sql`SELECT pages_read FROM "reading_activity" WHERE user_id = ${currentUser.id}`,
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].pages_read).toBe(45);
  });

  it("rejette une date qui n'est pas un jour civil", async () => {
    currentUser.id = await createUser(currentUser.email);

    const res = await recordActivity(
      request("http://localhost:3000/api/reading-activity", "POST", {
        pagesRead: 10,
        date: "10/02/2026",
      }),
    );

    expect(res.status).toBe(400);
  });
});

describe("POST /api/books/import", () => {
  it("importe les lignes valides et signale les autres par leur numéro de ligne", async () => {
    currentUser.id = await createUser(currentUser.email);
    const csv = [
      "title,author,pageCount",
      "Dune,Frank Herbert,890",
      ",Auteur Sans Titre,120",
      "L'Étranger,Albert Camus,186",
    ].join("\n");

    const res = await importBooks(
      request("http://localhost:3000/api/books/import", "POST", { csv }),
    );

    const body = await res.json();
    expect(body.data.imported).toBe(2);
    expect(body.data.failed).toBe(1);
    // Ligne 3 du fichier : en-tête + deux lignes de données au-dessus.
    expect(body.data.errors[0].line).toBe(3);
  });

  it("n'importe pas deux fois le même ISBN", async () => {
    currentUser.id = await createUser(currentUser.email);
    const csv = ["title,author,isbn", "Dune,Frank Herbert,9782266320481"].join("\n");
    const url = "http://localhost:3000/api/books/import";

    await importBooks(request(url, "POST", { csv }));
    const res = await importBooks(request(url, "POST", { csv }));

    const body = await res.json();
    expect(body.data.imported).toBe(0);
    expect(body.data.skipped).toBe(1);
    const rows = await db.execute(sql`SELECT id FROM "book" WHERE user_id = ${currentUser.id}`);
    expect(rows.rows).toHaveLength(1);
  });
});
