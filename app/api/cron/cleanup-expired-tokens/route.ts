import { createHash, timingSafeEqual } from "node:crypto";
import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { verification } from "@/drizzle/schema";
import { env } from "@/lib/env";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { logger } from "@/lib/logger";

/** Constant-time comparison (hashing first makes both buffers the same length). */
function isValidCronAuth(header: string | null): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${env.CRON_SECRET}`));
}

/**
 * Example scheduled task: deletes expired better-auth verification tokens.
 * Meant to be triggered by Coolify's Scheduled Tasks (or any cron caller) as:
 *   POST /api/cron/cleanup-expired-tokens
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Copy this pattern (secret check + handler) for any other scheduled task.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  if (!isValidCronAuth(request.headers.get("authorization"))) {
    return apiError("UNAUTHORIZED", "Invalid or missing cron secret.");
  }

  const deleted = await db.delete(verification).where(lt(verification.expiresAt, new Date()));

  logger.info({ deletedCount: deleted.rowCount }, "Cleaned up expired verification tokens");

  return apiSuccess({ deletedCount: deleted.rowCount ?? 0 });
});
