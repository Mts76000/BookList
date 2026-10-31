import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { env } from "@/lib/env";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { checkoutSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { getStripe, isBillingEnabled, priceIdFor } from "@/lib/stripe";
import { getUserPlan } from "@/lib/subscription";
import { TRIAL_DAYS } from "@/lib/plans";

const checkoutLimiter = createRateLimiter("billing-checkout", 10, 60);

/**
 * Ouvre une session Stripe Checkout pour l'abonnement Premium et renvoie son URL. Le client
 * Stripe est créé au premier passage et mémorisé, pour que tous les paiements d'un même
 * utilisateur se rattachent au même client (factures, portail).
 *
 * L'accès n'est pas accordé ici : il l'est par le webhook, seule source fiable du paiement.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await checkoutLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const stripe = getStripe();
  if (!stripe || !isBillingEnabled()) {
    return apiError("INTERNAL_ERROR", "Le paiement n'est pas encore disponible.", undefined, 503);
  }

  const validation = await validateBody(checkoutSchema, request);
  if (!validation.success) return validation.response;

  const plan = await getUserPlan(session.user.id);
  // Un Premium offert n'empêche pas de s'abonner : l'abonnement prend le relais à son terme.
  if (plan.isPremium && !plan.isGranted) {
    return apiError("CONFLICT", "Vous êtes déjà abonné à Premium.");
  }

  // Essai gratuit géré par Stripe, une fois par compte : la carte est enregistrée, rien
  // n'est prélevé avant la fin de l'essai, et l'abonnement peut être résilié avant.
  const withTrial = plan.trialAvailable;

  const [account] = await db
    .select({ email: user.email, name: user.name, customerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, session.user.id));

  let customerId = account?.customerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: account?.email,
      name: account?.name,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await db.update(user).set({ stripeCustomerId: customerId }).where(eq(user.id, session.user.id));
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: session.user.id,
    line_items: [{ price: priceIdFor(validation.data.interval), quantity: 1 }],
    subscription_data: {
      metadata: { userId: session.user.id },
      ...(withTrial
        ? {
            trial_period_days: TRIAL_DAYS,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          }
        : {}),
    },
    allow_promotion_codes: true,
    locale: "fr",
    // Recueille l'accord exprès exigé pour une exécution immédiate (CGV, droit de
    // rétractation), au plus près du bouton de paiement.
    custom_text: {
      submit: {
        message: withTrial
          ? `Aucun prélèvement pendant ${TRIAL_DAYS} jours : résiliez avant la fin de l'essai depuis votre compte pour ne rien payer. Ensuite, l'abonnement démarre et l'accès immédiat vaut renonciation au délai de rétractation, conformément aux conditions générales (${env.NEXT_PUBLIC_APP_URL}/legal/terms).`
          : `En vous abonnant, vous demandez l'accès immédiat à Premium et renoncez au délai de rétractation, conformément aux conditions générales (${env.NEXT_PUBLIC_APP_URL}/legal/terms). Remboursement intégral sur simple demande sous 14 jours.`,
      },
    },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/account/premium?premium=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/account/premium?premium=cancel`,
  });

  if (!checkout.url) {
    return apiError("INTERNAL_ERROR", "Impossible d'ouvrir la page de paiement.");
  }
  return apiSuccess({ url: checkout.url });
});
