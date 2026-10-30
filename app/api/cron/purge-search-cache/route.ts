import { env } from "@/lib/env";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { purgeExpiredSearches } from "@/lib/book-catalog";

/**
 * Tâche planifiée : supprime les recherches Google Books expirées du cache. À déclencher
 * une fois par jour depuis les Scheduled Tasks de Coolify, comme
 * `/api/cron/cleanup-expired-tokens` :
 *   POST /api/cron/purge-search-cache
 *   Authorization: Bearer <CRON_SECRET>
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return apiError("UNAUTHORIZED", "Invalid or missing cron secret.");
  }

  const deletedCount = await purgeExpiredSearches();

  logger.info({ deletedCount }, "Purged expired book searches");

  return apiSuccess({ deletedCount });
});
