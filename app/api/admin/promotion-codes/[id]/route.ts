import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";
import { getStripe } from "@/lib/stripe";
import { setPromotionCodeActive } from "@/lib/admin-stripe";
import { withStripeErrors } from "@/lib/admin-api";

const toggleSchema = z.object({ active: z.boolean() });

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Active ou désactive un code promo. Stripe ne permet pas de supprimer un code utilisé. */
export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  if (!getStripe())
    return apiError("INTERNAL_ERROR", "Stripe n'est pas configuré.", undefined, 503);

  const validation = await validateBody(toggleSchema, request);
  if (!validation.success) return validation.response;

  return withStripeErrors(async () => {
    const code = await setPromotionCodeActive(id, validation.data.active);
    await logAuditEvent({
      userId: session.user.id,
      action: "admin.toggle_promotion_code",
      entityType: "promotion_code",
      entityId: id,
      metadata: { code: code.code, active: code.active },
      ip,
      userAgent,
    });
    return apiSuccess(
      null,
      code.active ? `Code ${code.code} réactivé.` : `Code ${code.code} désactivé.`,
    );
  });
});
