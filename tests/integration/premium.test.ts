import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";
import { FREE_BOOK_LIMIT } from "@/lib/plans";
import { getUserPlan, syncSubscription } from "@/lib/subscription";

const currentUser = { id: "", email: "premium@booklist.fr" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: async () => ({ user: currentUser }) };
});

const { POST: createBook } = await import("@/app/api/books/route");
const { POST: importBooks } = await import("@/app/api/books/import/route");
const { PUT: setGoal, DELETE: removeGoal } = await import("@/app/api/reading-goal/route");
const { PUT: setFavorite, DELETE: resetFavorite } = await import("@/app/api/year-favorite/route");
const { getYearReview } = await import("@/lib/year-review");

let ipCounter = 0;

function request(url: string, method: string, body?: unknown) {
  ipCounter += 1;
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.0.9.${ipCounter % 250}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createUser(premiumUntil: Date | null = null): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role, premium_until, stripe_customer_id)
        VALUES (${id}, 'Lectrice', ${`${id}@booklist.fr`}, true, 'user', ${premiumUntil},
                ${`cus_${id.slice(0, 8)}`})`,
  );
  currentUser.id = id;
  return id;
}

async function seedBooks(userId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await db.execute(
      sql`INSERT INTO "book" (id, title, author, isbn, user_id)
          VALUES (${randomUUID()}, ${`Livre ${i}`}, 'Auteur', ${`978000000${String(i).padStart(4, "0")}`}, ${userId})`,
    );
  }
}

beforeAll(async () => {
  await runMigrations();
});

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE "user", "audit_logs", "book", "reading_goal", "catalog_book" CASCADE`,
  );
});

describe("limite du compte gratuit", () => {
  it(`refuse le ${FREE_BOOK_LIMIT + 1}e livre d'un compte gratuit`, async () => {
    const userId = await createUser();
    await seedBooks(userId, FREE_BOOK_LIMIT);

    const res = await createBook(
      request("http://localhost:3000/api/books", "POST", { title: "De trop", author: "X" }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.details).toEqual({ reason: "BOOK_LIMIT_REACHED", limit: FREE_BOOK_LIMIT });
  });

  it("laisse rescanner un livre déjà possédé une fois la limite atteinte", async () => {
    const userId = await createUser();
    await seedBooks(userId, FREE_BOOK_LIMIT);

    const res = await createBook(
      request("http://localhost:3000/api/books", "POST", {
        title: "Livre 0",
        author: "Auteur",
        isbn: "9780000000000",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("n'impose aucune limite à un compte Premium", async () => {
    const userId = await createUser(new Date(Date.now() + 86_400_000));
    await seedBooks(userId, FREE_BOOK_LIMIT);

    const res = await createBook(
      request("http://localhost:3000/api/books", "POST", { title: "Le 51e", author: "X" }),
    );
    expect(res.status).toBe(201);
  });

  it("importe toute la bibliothèque, même au-delà de la limite du compte gratuit", async () => {
    const userId = await createUser();
    await seedBooks(userId, FREE_BOOK_LIMIT - 2);

    const csv = [
      "title,author,isbn",
      "Un,A,9781111111111",
      "Deux,A,9782222222222",
      "Trois,A,9783333333333",
      // Doublon d'un livre déjà possédé : ignoré.
      "Livre 0,Auteur,9780000000000",
    ].join("\n");

    const res = await importBooks(
      request("http://localhost:3000/api/books/import", "POST", { csv }),
    );
    const { data } = await res.json();

    expect(data.imported).toBe(3);
    expect(data.skipped).toBe(1);
    // La bibliothèque dépasse la limite : seul l'ajout d'un nouveau livre est bloqué.
    expect((await getUserPlan(userId)).remaining).toBe(0);
  });

  it("importe un export Goodreads et le complète depuis le catalogue", async () => {
    await createUser();
    await db.execute(
      sql`INSERT INTO "catalog_book" (id, isbn, title, authors, cover_url, genres)
          VALUES ('vol-dune', '9782266320481', 'Dune', '{Frank Herbert}',
                  'https://books.google.com/dune.jpg', '{Science-fiction}')`,
    );
    const csv = [
      "Book Id,Title,Author,ISBN,ISBN13,My Rating,Number of Pages,Date Read,Exclusive Shelf",
      '1,Dune,Frank Herbert,"=""2266320483""","=""9782266320481""",5,890,2024/03/07,read',
    ].join("\n");

    const res = await importBooks(
      request("http://localhost:3000/api/books/import", "POST", { csv }),
    );
    const { data } = await res.json();
    expect(data.format).toBe("goodreads");
    expect(data.imported).toBe(1);

    const rows = await db.execute<{ cover_url: string; genre: string; user_rating: number }>(
      sql`SELECT cover_url, genre, user_rating FROM "book" WHERE user_id = ${currentUser.id}`,
    );
    expect(rows.rows[0]).toEqual({
      cover_url: "https://books.google.com/dune.jpg",
      genre: "Science-fiction",
      user_rating: 5,
    });
  });
});

describe("objectif de lecture", () => {
  it("fixe, remplace puis retire l'objectif de l'année", async () => {
    const userId = await createUser();

    await setGoal(request("http://localhost:3000/api/reading-goal", "PUT", { target: 12 }));
    await setGoal(request("http://localhost:3000/api/reading-goal", "PUT", { target: 30 }));

    const goals = await db.execute<{ year: number; target: number }>(
      sql`SELECT year, target FROM "reading_goal" WHERE user_id = ${userId}`,
    );
    expect(goals.rows).toEqual([{ year: new Date().getFullYear(), target: 30 }]);

    await removeGoal(request("http://localhost:3000/api/reading-goal", "DELETE"));
    const after = await db.execute(sql`SELECT 1 FROM "reading_goal" WHERE user_id = ${userId}`);
    expect(after.rows).toHaveLength(0);
  });

  it("refuse un objectif invalide", async () => {
    await createUser();
    const res = await setGoal(
      request("http://localhost:3000/api/reading-goal", "PUT", { target: 0 }),
    );
    expect(res.status).toBe(400);
  });
});

describe("syncSubscription", () => {
  function subscription(overrides: Partial<Stripe.Subscription>): Stripe.Subscription {
    return {
      id: "sub_123",
      customer: `cus_${currentUser.id.slice(0, 8)}`,
      status: "active",
      cancel_at_period_end: false,
      ended_at: null,
      metadata: {},
      items: {
        data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400 }],
      },
      ...overrides,
    } as unknown as Stripe.Subscription;
  }

  it("active Premium jusqu'à la fin de la période payée et le journalise", async () => {
    const userId = await createUser();

    await syncSubscription(subscription({}));

    const plan = await getUserPlan(userId);
    expect(plan.isPremium).toBe(true);
    expect(plan.subscriptionStatus).toBe("active");
    const audit = await db.execute<{ action: string }>(
      sql`SELECT action FROM "audit_logs" WHERE user_id = ${userId}`,
    );
    expect(audit.rows).toEqual([{ action: "billing.premium_started" }]);
  });

  it("garde l'accès d'un abonnement résilié jusqu'au terme", async () => {
    const userId = await createUser();

    await syncSubscription(subscription({ cancel_at_period_end: true }));

    const plan = await getUserPlan(userId);
    expect(plan.isPremium).toBe(true);
    expect(plan.cancelAtPeriodEnd).toBe(true);
  });

  it("retire l'accès à la fin effective de l'abonnement", async () => {
    const userId = await createUser(new Date(Date.now() + 86_400_000));

    await syncSubscription(
      subscription({ status: "canceled", ended_at: Math.floor(Date.now() / 1000) - 10 }),
    );

    expect((await getUserPlan(userId)).isPremium).toBe(false);
  });
});

describe("coup de cœur de l'année", () => {
  async function seedFinished(
    userId: string,
    title: string,
    endDate: string,
    rating: number | null,
  ) {
    const id = randomUUID();
    await db.execute(
      sql`INSERT INTO "book" (id, title, author, user_id, user_end_date, user_rating)
          VALUES (${id}, ${title}, 'Auteur', ${userId}, ${endDate}, ${rating})`,
    );
    return id;
  }

  it("remplace le choix automatique puis y revient", async () => {
    const userId = await createUser();
    await seedFinished(userId, "Le mieux noté", "2025-03-01", 5);
    const chosen = await seedFinished(userId, "Mon préféré", "2025-06-01", null);

    expect((await getYearReview(userId, 2025)).favoriteBook?.title).toBe("Le mieux noté");

    const res = await setFavorite(
      request("http://localhost:3000/api/year-favorite", "PUT", { year: 2025, bookId: chosen }),
    );
    expect(res.status).toBe(200);
    expect((await getYearReview(userId, 2025)).favoriteBook?.title).toBe("Mon préféré");

    await resetFavorite(request("http://localhost:3000/api/year-favorite?year=2025", "DELETE"));
    expect((await getYearReview(userId, 2025)).favoriteBook?.title).toBe("Le mieux noté");
  });

  it("refuse un livre terminé une autre année", async () => {
    const userId = await createUser();
    const bookId = await seedFinished(userId, "L'an dernier", "2024-12-31", 4);

    const res = await setFavorite(
      request("http://localhost:3000/api/year-favorite", "PUT", { year: 2025, bookId }),
    );
    expect(res.status).toBe(400);
  });

  it("refuse le livre d'un autre utilisateur", async () => {
    const otherId = await createUser();
    const foreignBook = await seedFinished(otherId, "Pas à moi", "2025-02-01", 5);
    await createUser();

    const res = await setFavorite(
      request("http://localhost:3000/api/year-favorite", "PUT", {
        year: 2025,
        bookId: foreignBook,
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe("essai gratuit", () => {
  function trialing(userId: string, overrides: Partial<Stripe.Subscription> = {}) {
    const now = Math.floor(Date.now() / 1000);
    return {
      id: "sub_trial",
      customer: `cus_${userId.slice(0, 8)}`,
      status: "trialing",
      trial_start: now,
      cancel_at_period_end: false,
      ended_at: null,
      metadata: {},
      items: { data: [{ current_period_end: now + 14 * 86_400 }] },
      ...overrides,
    } as unknown as Stripe.Subscription;
  }

  it("est proposé à un compte qui n'a jamais été abonné", async () => {
    const userId = await createUser();
    expect((await getUserPlan(userId)).trialAvailable).toBe(true);
  });

  it("donne Premium pendant l'essai Stripe et ne se propose plus ensuite", async () => {
    const userId = await createUser();
    await syncSubscription(trialing(userId));

    expect(await getUserPlan(userId)).toMatchObject({
      isPremium: true,
      isTrial: true,
      trialAvailable: false,
    });
    const audit = await db.execute<{ action: string }>(
      sql`SELECT action FROM "audit_logs" WHERE user_id = ${userId}`,
    );
    expect(audit.rows).toEqual([{ action: "billing.trial_started" }]);

    // Essai résilié et terminé : pas de second essai.
    await syncSubscription(
      trialing(userId, { status: "canceled", ended_at: Math.floor(Date.now() / 1000) - 10 }),
    );
    expect(await getUserPlan(userId)).toMatchObject({ isPremium: false, trialAvailable: false });
  });

  it("devient un abonnement payant à la fin de l'essai", async () => {
    const userId = await createUser();
    await syncSubscription(trialing(userId));
    await syncSubscription(trialing(userId, { status: "active" }));
    expect(await getUserPlan(userId)).toMatchObject({ isPremium: true, isTrial: false });
  });
});
