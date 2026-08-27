import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { verification } from "@/drizzle/schema";
import { env } from "@/lib/env";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { logger } from "@/lib/logger";

/**
 * Example scheduled task: deletes expired better-auth verification tokens.
 * Meant to be triggered by Coolify's Scheduled Tasks (or any cron caller) as:
 *   POST /api/cron/cleanup-expired-tokens
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Copy this pattern (secret check + handler) for any other scheduled task.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return apiError("UNAUTHORIZED", "Invalid or missing cron secret.");
  }

  const deleted = await db.delete(verification).where(lt(verification.expiresAt, new Date()));

  logger.info({ deletedCount: deleted.rowCount }, "Cleaned up expired verification tokens");

  return apiSuccess({ deletedCount: deleted.rowCount ?? 0 });
});
