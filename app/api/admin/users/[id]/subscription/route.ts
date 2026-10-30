import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { requireRole } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";
import { getStripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/subscription";
import { changeSubscriptionPlan, extendTrial } from "@/lib/admin-stripe";
import { withStripeErrors } from "@/lib/admin-api";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), days: z.coerce.number().int().min(1).max(3660) }),
  z.object({ action: z.literal("revoke_grant") }),
  z.object({ action: z.literal("cancel_at_period_end") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("cancel_now") }),
  z.object({ action: z.literal("change_plan"), interval: z.enum(["monthly", "yearly"]) }),
  z.object({ action: z.literal("extend_trial"), days: z.coerce.number().int().min(1).max(90) }),
]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Gestion de l'abonnement d'un utilisateur par un administrateur : offrir ou retirer du
 * Premium (sans Stripe), et résilier ou réactiver l'abonnement Stripe. Les remboursements se
 * font dans le Dashboard Stripe, lié depuis la fiche. Chaque action est journalisée.
 *
 * Après une action Stripe, l'abonnement renvoyé est recopié tout de suite sur le compte, sans
 * attendre le webhook, qui le recopiera de nouveau à l'identique.
 */
export const POST = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  const validation = await validateBody(actionSchema, request);
  if (!validation.success) return validation.response;
  const body = validation.data;

  const target = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!target) return apiError("NOT_FOUND", "Utilisateur introuvable.");
  if (target.isAnonymized) return apiError("CONFLICT", "Ce compte est supprimé.");

  const audit = (action: string, metadata: Record<string, unknown>) =>
    logAuditEvent({
      userId: session.user.id,
      action,
      entityType: "user",
      entityId: id,
      metadata: { email: target.email, ...metadata },
      ip,
      userAgent,
    });

  if (body.action === "grant") {
    // Une offre en cours est prolongée plutôt que remplacée.
    const base =
      target.premiumGrantedUntil && target.premiumGrantedUntil > new Date()
        ? target.premiumGrantedUntil
        : new Date();
    const grantedUntil = new Date(base.getTime() + body.days * DAY_MS);
    await db.update(user).set({ premiumGrantedUntil: grantedUntil }).where(eq(user.id, id));
    await audit("admin.grant_premium", { days: body.days, until: grantedUntil.toISOString() });
    return apiSuccess(
      { grantedUntil },
      `Premium offert jusqu'au ${grantedUntil.toLocaleDateString("fr-FR")}.`,
    );
  }

  if (body.action === "revoke_grant") {
    await db.update(user).set({ premiumGrantedUntil: null }).where(eq(user.id, id));
    await audit("admin.revoke_premium", {});
    return apiSuccess(null, "Premium offert retiré.");
  }

  const stripe = getStripe();
  if (!stripe) {
    return apiError("INTERNAL_ERROR", "Stripe n'est pas configuré.", undefined, 503);
  }
  if (!target.stripeSubscriptionId || target.subscriptionStatus === "canceled") {
    return apiError("CONFLICT", "Aucun abonnement Stripe en cours sur ce compte.");
  }

  const subscriptionId = target.stripeSubscriptionId;

  if (body.action === "change_plan" || body.action === "extend_trial") {
    if (body.action === "extend_trial" && target.subscriptionStatus !== "trialing") {
      return apiError("CONFLICT", "Cet abonnement n'est pas en période d'essai.");
    }
    return withStripeErrors(async () => {
      const updated =
        body.action === "change_plan"
          ? await changeSubscriptionPlan(subscriptionId, body.interval)
          : await extendTrial(subscriptionId, target.premiumUntil ?? new Date(), body.days);
      await syncSubscription(updated);
      if (body.action === "change_plan") {
        await audit("admin.change_plan", { interval: body.interval });
        return apiSuccess(
          null,
          `Formule ${body.interval === "yearly" ? "annuelle" : "mensuelle"} appliquée, au prorata.`,
        );
      }
      await audit("admin.extend_trial", { days: body.days });
      return apiSuccess(null, `Essai prolongé de ${body.days} jours.`);
    });
  }

  const subscription =
    body.action === "cancel_now"
      ? await stripe.subscriptions.cancel(subscriptionId)
      : await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: body.action === "cancel_at_period_end",
        });
  await syncSubscription(subscription);

  if (body.action === "resume") {
    await audit("admin.resume_subscription", {});
    return apiSuccess(null, "Abonnement réactivé.");
  }
  await audit("admin.cancel_subscription", { immediately: body.action === "cancel_now" });
  return apiSuccess(
    null,
    body.action === "cancel_now"
      ? "Abonnement résilié immédiatement."
      : "Résiliation programmée en fin de période.",
  );
});
