import { count, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { book, user } from "@/drizzle/schema";
import { FREE_BOOK_LIMIT, isPremiumActive } from "@/lib/plans";
import { logAuditEvent } from "@/lib/audit-log";
import { logger } from "@/lib/logger";

export interface UserPlan {
  isPremium: boolean;
  /** Fin de la période payée (ou de l'essai) de l'abonnement Stripe. */
  premiumUntil: Date | null;
  /** Premium offert par un administrateur, jusqu'à cette date. */
  grantedUntil: Date | null;
  /** Premium uniquement grâce à une offre, sans abonnement actif. */
  isGranted: boolean;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
  /** Essai gratuit en cours, sans abonnement payant. */
  isTrial: boolean;
  /** L'essai gratuit n'a jamais été utilisé et aucun abonnement n'a existé. */
  trialAvailable: boolean;
  bookCount: number;
  /** `null` pour un compte Premium, sans limite. */
  bookLimit: number | null;
  /** Livres encore ajoutables, `Infinity` pour un compte Premium. */
  remaining: number;
}

/**
 * Plan de l'utilisateur, lu en base à chaque appel plutôt que dans la session : un
 * abonnement qui vient d'être payé ou résilié doit compter tout de suite, sans attendre
 * l'expiration d'un cache de session.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const [[account], [{ value: bookCount }]] = await Promise.all([
    db
      .select({
        premiumUntil: user.premiumUntil,
        grantedUntil: user.premiumGrantedUntil,
        subscriptionStatus: user.subscriptionStatus,
        cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        trialStartedAt: user.trialStartedAt,
      })
      .from(user)
      .where(eq(user.id, userId)),
    db.select({ value: count() }).from(book).where(eq(book.userId, userId)),
  ]);

  const hasSubscription = isPremiumActive(account?.premiumUntil);
  const hasGrant = isPremiumActive(account?.grantedUntil);
  const isPremium = hasSubscription || hasGrant;
  return {
    isPremium,
    premiumUntil: account?.premiumUntil ?? null,
    grantedUntil: account?.grantedUntil ?? null,
    isGranted: hasGrant && !hasSubscription,
    subscriptionStatus: account?.subscriptionStatus ?? null,
    cancelAtPeriodEnd: account?.cancelAtPeriodEnd ?? false,
    hasBillingAccount: !!account?.stripeCustomerId,
    isTrial: hasSubscription && account?.subscriptionStatus === "trialing",
    trialAvailable: !isPremium && !account?.trialStartedAt && !account?.stripeSubscriptionId,
    bookCount,
    bookLimit: isPremium ? null : FREE_BOOK_LIMIT,
    remaining: isPremium ? Infinity : Math.max(FREE_BOOK_LIMIT - bookCount, 0),
  };
}

/** Statuts Stripe pour lesquels l'abonné garde l'accès jusqu'à la fin de la période. */
const ACCESS_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

/**
 * Fin de la période payée. Depuis les versions 2025 de l'API, elle se lit sur les lignes de
 * l'abonnement et non plus sur l'abonnement lui-même ; un abonnement BookList n'en a qu'une.
 */
function periodEnd(subscription: Stripe.Subscription): Date | null {
  const ends = subscription.items.data.map((item) => item.current_period_end);
  return ends.length > 0 ? new Date(Math.max(...ends) * 1000) : null;
}

/**
 * Recopie l'état d'un abonnement Stripe sur l'utilisateur, retrouvé par son id client Stripe
 * (ou, au tout premier événement, par l'id BookList passé en métadonnée). Idempotent : Stripe
 * peut livrer deux fois le même événement, ou dans le désordre, et c'est toujours l'état
 * courant de l'abonnement qui est écrit.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const [account] = await db
    .select({ id: user.id, premiumUntil: user.premiumUntil, trialStartedAt: user.trialStartedAt })
    .from(user)
    .where(eq(user.stripeCustomerId, customerId));
  const userId = account?.id ?? subscription.metadata.userId;
  if (!userId) {
    logger.warn({ customerId }, "Stripe subscription for an unknown customer");
    return;
  }

  const hasAccess = ACCESS_STATUSES.includes(subscription.status);
  const premiumUntil = hasAccess
    ? periodEnd(subscription)
    : subscription.ended_at
      ? new Date(subscription.ended_at * 1000)
      : new Date();

  const wasPremium = isPremiumActive(account?.premiumUntil);

  const interval = subscription.items.data[0]?.price?.recurring?.interval;

  await db
    .update(user)
    .set({
      subscriptionInterval:
        interval === "year" ? "yearly" : interval === "month" ? "monthly" : null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
      premiumUntil,
      // L'essai Stripe ne sert qu'une fois : on retient qu'il a été consommé.
      ...(subscription.trial_start && !account?.trialStartedAt
        ? { trialStartedAt: new Date(subscription.trial_start * 1000) }
        : {}),
    })
    .where(eq(user.id, userId));

  const isPremium = isPremiumActive(premiumUntil);
  if (isPremium !== wasPremium) {
    await logAuditEvent({
      userId,
      action: isPremium
        ? subscription.status === "trialing"
          ? "billing.trial_started"
          : "billing.premium_started"
        : "billing.premium_ended",
      entityType: "subscription",
      entityId: subscription.id,
      metadata: { status: subscription.status },
    });
  }
}
