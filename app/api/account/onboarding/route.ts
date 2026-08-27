import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const onboardingLimiter = createRateLimiter("account-onboarding", 10, 60);

/**
 * Marque l'accueil des nouveaux utilisateurs comme vu. Sans corps de requête : le geste est
 * à sens unique, il n'y a pas de « revoir l'onboarding ».
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await onboardingLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  await db.update(user).set({ hasSeenOnboarding: true }).where(eq(user.id, session.user.id));

  return apiSuccess(null);
});
