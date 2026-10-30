import type Stripe from "stripe";
import { env } from "@/lib/env";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { getStripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/subscription";
import { logger } from "@/lib/logger";

/**
 * Webhook Stripe : seule source de vérité de l'abonnement. Pas de session ici, l'appelant
 * est Stripe : l'authenticité tient à la signature, vérifiée sur le corps brut exact.
 *
 * Tous les événements d'abonnement se ramènent à une relecture de l'abonnement lui-même
 * (`syncSubscription`), ce qui rend leur ordre d'arrivée sans importance.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return apiError("INTERNAL_ERROR", "Webhook not configured.", undefined, 503);
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return apiError("UNAUTHORIZED", "Invalid webhook signature.");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const subscription = event.data.object.subscription;
      if (subscription) {
        const id = typeof subscription === "string" ? subscription : subscription.id;
        await syncSubscription(await stripe.subscriptions.retrieve(id));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    default:
      logger.debug({ type: event.type }, "Ignored Stripe event");
  }

  return apiSuccess({ received: true });
});
