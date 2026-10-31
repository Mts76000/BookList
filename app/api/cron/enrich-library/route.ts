import { env } from "@/lib/env";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { enrichLibrary } from "@/lib/library-enrichment";

/** Livres traités par passage : une minute de travail au plus, quotas des sources ménagés. */
const BATCH_SIZE = 30;

/**
 * Tâche planifiée : complète couvertures, nombres de pages et résumés manquants des
 * bibliothèques (voir `lib/library-enrichment.ts`), par lots. À déclencher toutes les dix
 * minutes depuis les Scheduled Tasks de Coolify, comme `/api/cron/purge-search-cache` :
 *   POST /api/cron/enrich-library
 *   Authorization: Bearer <CRON_SECRET>
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return apiError("UNAUTHORIZED", "Invalid or missing cron secret.");
  }

  const result = await enrichLibrary({ limit: BATCH_SIZE });
  logger.info(result, "Enriched library books");
  return apiSuccess(result);
});
