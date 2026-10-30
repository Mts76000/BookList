import { requireAuth } from "@/lib/permissions";
import { apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { getUserPlan } from "@/lib/subscription";

/**
 * Plan de l'utilisateur courant, pour les écrans clients qui préviennent de la limite du
 * compte gratuit avant qu'elle ne bloque (ajout, import).
 */
export const GET = withApiErrorHandling(async () => {
  const session = await requireAuth();
  const plan = await getUserPlan(session.user.id);
  return apiSuccess({
    isPremium: plan.isPremium,
    trialAvailable: plan.trialAvailable,
    bookCount: plan.bookCount,
    bookLimit: plan.bookLimit,
    // Infinity n'existe pas en JSON.
    remaining: plan.isPremium ? null : plan.remaining,
  });
});
