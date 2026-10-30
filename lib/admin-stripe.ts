import { inArray } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { getStripe, priceIdFor } from "@/lib/stripe";
import type { BillingInterval } from "@/lib/plans";

/**
 * Lecture et actions Stripe du back-office. Réservé aux appelants déjà passés par
 * requireRole("admin"). Chaque fonction lève si Stripe n'est pas configuré : les pages
 * vérifient `getStripe()` avant de les appeler.
 */

function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe;
}

export interface PaymentRow {
  id: string;
  amount: number;
  amountRefunded: number;
  currency: string;
  status: string;
  refunded: boolean;
  created: Date;
  email: string | null;
  failureMessage: string | null;
  receiptUrl: string | null;
  /** Compte BookList correspondant au client Stripe, s'il existe encore. */
  userId: string | null;
  userName: string | null;
}

/** Derniers paiements (charges Stripe), éventuellement d'un seul client. */
export async function listPayments(options: { customerId?: string; limit?: number } = {}) {
  const stripe = requireStripe();
  const charges = await stripe.charges.list({
    limit: options.limit ?? 50,
    ...(options.customerId ? { customer: options.customerId } : {}),
  });

  const customerIds = [
    ...new Set(
      charges.data
        .map((charge) =>
          typeof charge.customer === "string" ? charge.customer : charge.customer?.id,
        )
        .filter((id): id is string => !!id),
    ),
  ];
  const owners =
    customerIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name, customerId: user.stripeCustomerId })
          .from(user)
          .where(inArray(user.stripeCustomerId, customerIds))
      : [];
  const byCustomer = new Map(owners.map((owner) => [owner.customerId, owner]));

  return charges.data.map((charge): PaymentRow => {
    const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
    const owner = customerId ? byCustomer.get(customerId) : undefined;
    return {
      id: charge.id,
      amount: charge.amount,
      amountRefunded: charge.amount_refunded,
      currency: charge.currency,
      status: charge.status,
      refunded: charge.refunded,
      created: new Date(charge.created * 1000),
      email: charge.billing_details.email ?? charge.receipt_email,
      failureMessage: charge.failure_message,
      receiptUrl: charge.receipt_url,
      userId: owner?.id ?? null,
      userName: owner?.name ?? null,
    };
  });
}

/** Rembourse un paiement, en totalité ou en partie (montant en centimes). */
export async function refundPayment(chargeId: string, amountCents?: number) {
  return requireStripe().refunds.create({
    charge: chargeId,
    ...(amountCents ? { amount: amountCents } : {}),
    reason: "requested_by_customer",
  });
}

export interface PromotionCodeRow {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: Date | null;
  firstTimeOnly: boolean;
  /** Remise lisible : « -50 % pendant 3 mois », « -5,00 € une fois »... */
  discount: string;
}

function describeCoupon(coupon: Stripe.Coupon | null): string {
  if (!coupon) return "—";
  const amount = coupon.percent_off
    ? `-${coupon.percent_off} %`
    : `-${((coupon.amount_off ?? 0) / 100).toLocaleString("fr-FR", { style: "currency", currency: coupon.currency ?? "eur" })}`;
  const duration =
    coupon.duration === "once"
      ? "sur le premier paiement"
      : coupon.duration === "forever"
        ? "à vie"
        : `pendant ${coupon.duration_in_months} mois`;
  return `${amount} ${duration}`;
}

export async function listPromotionCodes(): Promise<PromotionCodeRow[]> {
  const codes = await requireStripe().promotionCodes.list({
    limit: 100,
    expand: ["data.promotion.coupon"],
  });
  return codes.data.map((code) => ({
    id: code.id,
    code: code.code,
    active: code.active,
    timesRedeemed: code.times_redeemed,
    maxRedemptions: code.max_redemptions,
    expiresAt: code.expires_at ? new Date(code.expires_at * 1000) : null,
    firstTimeOnly: code.restrictions.first_time_transaction,
    discount: describeCoupon(
      typeof code.promotion.coupon === "object" ? code.promotion.coupon : null,
    ),
  }));
}

export interface NewPromotionCode {
  code: string;
  percentOff?: number;
  amountOffCents?: number;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: Date;
  firstTimeOnly: boolean;
}

/** Crée un coupon et le code promo qui l'expose, saisi par le client dans Stripe Checkout. */
export async function createPromotionCode(input: NewPromotionCode) {
  const stripe = requireStripe();
  const coupon = await stripe.coupons.create({
    name: input.code,
    duration: input.duration,
    ...(input.duration === "repeating" ? { duration_in_months: input.durationInMonths } : {}),
    ...(input.percentOff
      ? { percent_off: input.percentOff }
      : { amount_off: input.amountOffCents, currency: "eur" }),
  });
  return stripe.promotionCodes.create({
    code: input.code,
    promotion: { type: "coupon", coupon: coupon.id },
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
    ...(input.expiresAt ? { expires_at: Math.floor(input.expiresAt.getTime() / 1000) } : {}),
    restrictions: { first_time_transaction: input.firstTimeOnly },
  });
}

export async function setPromotionCodeActive(id: string, active: boolean) {
  return requireStripe().promotionCodes.update(id, { active });
}

/** Passe un abonnement sur l'autre formule, au prorata. */
export async function changeSubscriptionPlan(subscriptionId: string, interval: BillingInterval) {
  const stripe = requireStripe();
  const price = priceIdFor(interval);
  if (!price) throw new Error(`Missing Stripe price for ${interval}`);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const [item] = subscription.items.data;
  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price }],
    proration_behavior: "create_prorations",
  });
}

/** Prolonge un essai en cours de `days` jours (geste commercial). */
export async function extendTrial(subscriptionId: string, currentEnd: Date, days: number) {
  const trialEnd = Math.floor(currentEnd.getTime() / 1000) + days * 24 * 60 * 60;
  return requireStripe().subscriptions.update(subscriptionId, {
    trial_end: trialEnd,
    proration_behavior: "none",
  });
}
