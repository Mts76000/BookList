import { and, desc, eq, gt, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { env } from "@/lib/env";
import { isPremiumActive } from "@/lib/plans";

/** Montants facturés, en centimes, pour le revenu mensuel estimé. */
const MONTHLY_CENTS = 299;
const YEARLY_CENTS = 2400;

export type SubscriptionKind =
  "paying" | "trial" | "past_due" | "cancel_scheduled" | "granted" | "ended";

export const SUBSCRIPTION_KIND_LABELS: Record<SubscriptionKind, string> = {
  paying: "Payant",
  trial: "Essai",
  past_due: "Impayé",
  cancel_scheduled: "Résiliation prévue",
  granted: "Offert",
  ended: "Terminé",
};

export interface SubscriberRow {
  id: string;
  name: string;
  email: string;
  kind: SubscriptionKind;
  interval: string | null;
  /** Date de fin de l'accès en cours : période payée, essai ou offre. */
  until: Date | null;
  stripeCustomerId: string | null;
}

/**
 * Situation d'abonnement d'un compte, en une catégorie lisible. L'ordre des tests compte :
 * un impayé ou une résiliation prévue l'emportent sur « payant », et une offre ne s'affiche
 * que sans abonnement actif.
 */
export function subscriptionKind(row: {
  premiumUntil: Date | null;
  premiumGrantedUntil: Date | null;
  subscriptionStatus: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
}): SubscriptionKind {
  if (isPremiumActive(row.premiumUntil)) {
    if (row.subscriptionStatus === "trialing") return "trial";
    if (row.subscriptionStatus === "past_due") return "past_due";
    if (row.subscriptionCancelAtPeriodEnd) return "cancel_scheduled";
    return "paying";
  }
  if (isPremiumActive(row.premiumGrantedUntil)) return "granted";
  return "ended";
}

/** Lien vers le client dans le Dashboard Stripe, en mode test ou réel selon la clé. */
export function stripeCustomerUrl(customerId: string): string {
  const testMode = env.STRIPE_SECRET_KEY?.startsWith("sk_test") ?? true;
  return `https://dashboard.stripe.com/${testMode ? "test/" : ""}customers/${customerId}`;
}

export interface SubscriptionOverview {
  counts: Record<SubscriptionKind, number>;
  /** Revenu mensuel récurrent estimé, en centimes : abonnements payants et impayés. */
  mrrCents: number;
  rows: SubscriberRow[];
}

/** Tous les comptes qui ont eu un abonnement ou une offre, du plus récent au plus ancien. */
export async function getSubscriptionOverview(): Promise<SubscriptionOverview> {
  const accounts = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      premiumUntil: user.premiumUntil,
      premiumGrantedUntil: user.premiumGrantedUntil,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionCancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
      subscriptionInterval: user.subscriptionInterval,
      stripeCustomerId: user.stripeCustomerId,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(
      and(
        eq(user.isAnonymized, false),
        or(
          isNotNull(user.stripeSubscriptionId),
          isNotNull(user.premiumGrantedUntil),
          gt(user.premiumUntil, new Date(0)),
        ),
      ),
    )
    .orderBy(desc(user.updatedAt));

  const counts: Record<SubscriptionKind, number> = {
    paying: 0,
    trial: 0,
    past_due: 0,
    cancel_scheduled: 0,
    granted: 0,
    ended: 0,
  };
  let mrrCents = 0;

  const rows = accounts.map((account): SubscriberRow => {
    const kind = subscriptionKind(account);
    counts[kind] += 1;
    if (kind === "paying" || kind === "past_due" || kind === "cancel_scheduled") {
      mrrCents += account.subscriptionInterval === "yearly" ? YEARLY_CENTS / 12 : MONTHLY_CENTS;
    }
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      kind,
      interval: account.subscriptionInterval,
      until: kind === "granted" ? account.premiumGrantedUntil : account.premiumUntil,
      stripeCustomerId: account.stripeCustomerId,
    };
  });

  return { counts, mrrCents: Math.round(mrrCents), rows };
}
