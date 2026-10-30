import { db } from "@/lib/db";
import { readingChallenge } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { challengeSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { getUserPlan } from "@/lib/subscription";

const challengeLimiter = createRateLimiter("challenges", 30, 60);

/** Crée un défi personnel pour l'année en cours. Réservé à Premium. */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await challengeLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  if (!(await getUserPlan(session.user.id)).isPremium) {
    return apiError("FORBIDDEN", "Les défis personnels sont réservés à Premium.");
  }

  const validation = await validateBody(challengeSchema, request);
  if (!validation.success) return validation.response;
  const { title, kind, target, filter } = validation.data;

  const [created] = await db
    .insert(readingChallenge)
    .values({
      userId: session.user.id,
      year: new Date().getFullYear(),
      title,
      kind,
      target,
      filter: kind === "genre" || kind === "author" ? filter : null,
    })
    .returning();

  return apiSuccess(created, "Défi créé.", 201);
});
