import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { readingChallenge } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const deleteLimiter = createRateLimiter("challenges-delete", 30, 60);

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Supprime un défi. Ouvert aussi aux comptes repassés en gratuit : on peut toujours faire
 * le ménage dans ce qu'on a créé.
 */
export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await deleteLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const [deleted] = await db
    .delete(readingChallenge)
    .where(and(eq(readingChallenge.id, id), eq(readingChallenge.userId, session.user.id)))
    .returning({ id: readingChallenge.id });
  if (!deleted) return apiError("NOT_FOUND", "Défi introuvable.");

  return apiSuccess(null, "Défi supprimé.");
});
