import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { env } from "@/lib/env";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { getStripe } from "@/lib/stripe";

const portalLimiter = createRateLimiter("billing-portal", 10, 60);

/**
 * Ouvre le portail client Stripe (moyen de paiement, factures, résiliation) et renvoie son
 * URL. BookList ne gère ni carte ni facture lui-même.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await portalLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const stripe = getStripe();
  if (!stripe) {
    return apiError("INTERNAL_ERROR", "Le paiement n'est pas encore disponible.", undefined, 503);
  }

  const [account] = await db
    .select({ customerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, session.user.id));
  if (!account?.customerId) {
    return apiError("NOT_FOUND", "Aucun abonnement associé à ce compte.");
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: account.customerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/account`,
    locale: "fr",
  });

  return apiSuccess({ url: portal.url });
});
