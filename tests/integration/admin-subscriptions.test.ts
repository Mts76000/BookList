import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { runMigrations } from "@/drizzle/migrate";
import { getUserPlan } from "@/lib/subscription";
import { getSubscriptionOverview } from "@/lib/admin-subscriptions";

const currentAdmin = { id: "", email: "admin@booklist.fr", role: "admin" };

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return {
    ...actual,
    requireAuth: async () => ({ user: currentAdmin }),
    requireRole: async () => ({ user: currentAdmin }),
  };
});

const { POST: manageSubscription } = await import("@/app/api/admin/users/[id]/subscription/route");

let ipCounter = 0;
function request(body: unknown) {
  ipCounter += 1;
  return new Request("http://localhost/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.0.13.${ipCounter % 250}`,
    },
    body: JSON.stringify(body),
  });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function createUser(fields: Record<string, unknown> = {}): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO "user" (id, name, email, email_verified, role, premium_until,
                            premium_granted_until, stripe_subscription_id, subscription_status,
                            subscription_interval, subscription_cancel_at_period_end)
        VALUES (${id}, 'Lectrice', ${`${id}@booklist.fr`}, true, 'user',
                ${(fields.premiumUntil as Date) ?? null}, ${(fields.grantedUntil as Date) ?? null},
                ${(fields.subscriptionId as string) ?? null}, ${(fields.status as string) ?? null},
                ${(fields.interval as string) ?? null}, ${(fields.cancelAtPeriodEnd as boolean) ?? false})`,
  );
  return id;
}

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000);

beforeAll(async () => {
  await runMigrations();
  currentAdmin.id = await createUser();
});

afterEach(async () => {
  await db.execute(sql`DELETE FROM "audit_logs"`);
  await db.execute(sql`DELETE FROM "user" WHERE id <> ${currentAdmin.id}`);
});

describe("Premium offert par l'administration", () => {
  it("donne Premium sans Stripe et se prolonge plutôt que se remplacer", async () => {
    const userId = await createUser();

    await manageSubscription(request({ action: "grant", days: 30 }), context(userId));
    const first = await getUserPlan(userId);
    expect(first).toMatchObject({ isPremium: true, isGranted: true, trialAvailable: false });

    await manageSubscription(request({ action: "grant", days: 30 }), context(userId));
    const second = await getUserPlan(userId);
    const days = (second.grantedUntil!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(59);

    const audit = await db.execute<{ action: string }>(
      sql`SELECT action FROM "audit_logs" WHERE entity_id = ${userId}`,
    );
    expect(audit.rows.map((row) => row.action)).toEqual([
      "admin.grant_premium",
      "admin.grant_premium",
    ]);
  });

  it("se retire sans toucher à un abonnement payant", async () => {
    const userId = await createUser({
      premiumUntil: inDays(20),
      grantedUntil: inDays(60),
      subscriptionId: "sub_1",
      status: "active",
    });
    await manageSubscription(request({ action: "revoke_grant" }), context(userId));
    expect(await getUserPlan(userId)).toMatchObject({ isPremium: true, isGranted: false });
  });

  it("refuse une action Stripe sans abonnement en cours", async () => {
    const userId = await createUser();
    const res = await manageSubscription(
      request({ action: "cancel_at_period_end" }),
      context(userId),
    );
    expect([409, 503]).toContain(res.status);
  });
});

describe("getSubscriptionOverview", () => {
  it("classe les comptes et estime le revenu mensuel hors essais", async () => {
    await createUser({
      premiumUntil: inDays(20),
      subscriptionId: "s1",
      status: "active",
      interval: "monthly",
    });
    await createUser({
      premiumUntil: inDays(200),
      subscriptionId: "s2",
      status: "active",
      interval: "yearly",
    });
    await createUser({
      premiumUntil: inDays(10),
      subscriptionId: "s3",
      status: "trialing",
      interval: "yearly",
    });
    await createUser({
      premiumUntil: inDays(5),
      subscriptionId: "s4",
      status: "active",
      interval: "monthly",
      cancelAtPeriodEnd: true,
    });
    await createUser({ grantedUntil: inDays(30) });

    const overview = await getSubscriptionOverview();
    expect(overview.counts).toMatchObject({
      paying: 2,
      trial: 1,
      cancel_scheduled: 1,
      granted: 1,
    });
    // 2,99 + 24/12 + 2,99 (résiliation prévue mais encore payante).
    expect(overview.mrrCents).toBe(299 + 200 + 299);
  });
});
