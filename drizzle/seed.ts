import { config } from "dotenv";
config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Seeding database...");
  // Note: this only creates `user` rows (profile data). Password credentials for these
  // accounts are seeded separately via better-auth's signup API once lib/auth.ts exists,
  // so hashing stays owned by better-auth instead of being duplicated here.

  await db
    .insert(schema.user)
    .values([
      {
        id: randomUUID(),
        name: "Test User",
        email: "user@example.com",
        emailVerified: true,
        role: "user",
      },
      {
        id: randomUUID(),
        name: "Test Admin",
        email: "admin@example.com",
        emailVerified: true,
        role: "admin",
      },
    ])
    .onConflictDoNothing({ target: schema.user.email });

  console.log("Seed complete.");
  await pool.end();
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  runSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
