import Stripe from "stripe";
import { env } from "@/lib/env";
import type { BillingInterval } from "@/lib/plans";

let client: Stripe | null = null;

/**
 * Client Stripe, ou `null` tant que le paiement n'est pas configuré : l'application tourne
 * alors normalement, les offres restent visibles et seul le bouton d'abonnement est inactif.
 */
export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}

export function isBillingEnabled(): boolean {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_YEARLY);
}

export function priceIdFor(interval: BillingInterval): string | undefined {
  return interval === "monthly" ? env.STRIPE_PRICE_MONTHLY : env.STRIPE_PRICE_YEARLY;
}
