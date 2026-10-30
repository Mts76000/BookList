import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { readingGoal } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { readingGoalSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const goalLimiter = createRateLimiter("reading-goal", 30, 60);

/**
 * Seul l'objectif de l'année en cours est modifiable : celui d'une année écoulée fait partie
 * de son bilan, et le réécrire après coup le viderait de son sens.
 */
function currentYear(): number {
  return new Date().getFullYear();
}

/** Fixe ou remplace l'objectif de lecture de l'année en cours. */
export const PUT = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await goalLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(readingGoalSchema, request);
  if (!validation.success) return validation.response;
  const { target } = validation.data;

  const [goal] = await db
    .insert(readingGoal)
    .values({ userId: session.user.id, year: currentYear(), target })
    .onConflictDoUpdate({
      target: [readingGoal.userId, readingGoal.year],
      set: { target },
    })
    .returning();

  return apiSuccess(goal, "Objectif enregistré.");
});

/** Retire l'objectif de l'année en cours. Sans effet s'il n'y en avait pas. */
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await goalLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  await db
    .delete(readingGoal)
    .where(and(eq(readingGoal.userId, session.user.id), eq(readingGoal.year, currentYear())));

  return apiSuccess(null, "Objectif retiré.");
});
