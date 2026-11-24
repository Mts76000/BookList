import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import * as schema from "@/drizzle/schema";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// An idle client can lose its connection at any time (e.g. Postgres restarting during an
// image update: "terminating connection due to administrator command"). pg then emits
// `error` on the pool, and an unhandled `error` event on an EventEmitter crashes the Node
// process. pg already removes the faulty client from the pool, so logging is enough —
// never rethrow here.
pool.on("error", (err) => logger.warn({ err }, "idle pg client error"));

export const db = drizzle(pool, { schema });
