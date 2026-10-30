import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quote } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const deleteLimiter = createRateLimiter("quotes-delete", 60, 60);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Supprime une de ses citations. */
export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await deleteLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const [deleted] = await db
    .delete(quote)
    .where(and(eq(quote.id, id), eq(quote.userId, session.user.id)))
    .returning({ id: quote.id });
  if (!deleted) return apiError("NOT_FOUND", "Citation introuvable.");

  return apiSuccess(null, "Citation supprimée.");
});
