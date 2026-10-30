import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscription } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { pushSubscriptionSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { isPushEnabled } from "@/lib/push";
import { z } from "zod";

const subscriptionLimiter = createRateLimiter("push-subscription", 20, 60);

/** Active les rappels de lecture sur l'appareil courant. */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await subscriptionLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }
  if (!isPushEnabled()) {
    return apiError(
      "INTERNAL_ERROR",
      "Les rappels ne sont pas encore disponibles.",
      undefined,
      503,
    );
  }

  const validation = await validateBody(pushSubscriptionSchema, request);
  if (!validation.success) return validation.response;
  const { endpoint, keys } = validation.data;

  // Un même appareil peut changer de compte : l'abonnement suit le dernier connecté.
  await db
    .insert(pushSubscription)
    .values({ endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id },
    });

  return apiSuccess(null, "Rappels activés.");
});

const unsubscribeSchema = z.object({ endpoint: z.url().max(2000) });

/** Désactive les rappels sur l'appareil courant. */
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await subscriptionLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(unsubscribeSchema, request);
  if (!validation.success) return validation.response;

  await db
    .delete(pushSubscription)
    .where(
      and(
        eq(pushSubscription.endpoint, validation.data.endpoint),
        eq(pushSubscription.userId, session.user.id),
      ),
    );

  return apiSuccess(null, "Rappels désactivés.");
});
