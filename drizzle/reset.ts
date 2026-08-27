import { config } from "dotenv";
config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.local", quiet: true });

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { runMigrations } from "./migrate";
import { runSeed } from "./seed";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  console.log("Resetting database (dropping and recreating public + drizzle schemas)...");
  // drizzle-kit tracks applied migrations in a separate "drizzle" schema — drop it too,
  // otherwise the migrator thinks old migrations are already applied against empty tables.
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await pool.end();

  await runMigrations();
  await runSeed();

  console.log("Reset complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
