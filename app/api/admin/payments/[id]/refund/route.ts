import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";
import { getStripe } from "@/lib/stripe";
import { refundPayment } from "@/lib/admin-stripe";
import { withStripeErrors } from "@/lib/admin-api";

const refundSchema = z.object({
  /** Montant en centimes ; absent, le paiement est remboursé en totalité. */
  amountCents: z.coerce.number().int().min(1).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Rembourse un paiement Stripe, en totalité ou en partie. */
export const POST = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  if (!getStripe())
    return apiError("INTERNAL_ERROR", "Stripe n'est pas configuré.", undefined, 503);

  const validation = await validateBody(refundSchema, request);
  if (!validation.success) return validation.response;

  return withStripeErrors(async () => {
    const refund = await refundPayment(id, validation.data.amountCents);
    await logAuditEvent({
      userId: session.user.id,
      action: "admin.refund_payment",
      entityType: "payment",
      entityId: id,
      metadata: { amount: refund.amount, currency: refund.currency },
      ip,
      userAgent,
    });
    return apiSuccess(
      { refundId: refund.id },
      `Remboursement de ${(refund.amount / 100).toLocaleString("fr-FR", { style: "currency", currency: refund.currency })} effectué.`,
    );
  });
});
