import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    return apiError("INTERNAL_ERROR", "Database unreachable.", undefined, 503);
  }

  return apiSuccess({ status: "ok" });
}
