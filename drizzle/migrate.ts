import { config } from "dotenv";
config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.local", quiet: true });

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations complete.");

  await pool.end();
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
