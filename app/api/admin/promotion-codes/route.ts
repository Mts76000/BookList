import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";
import { getStripe } from "@/lib/stripe";
import { createPromotionCode } from "@/lib/admin-stripe";
import { withStripeErrors } from "@/lib/admin-api";

const promotionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,40}$/, "Code : 3 à 40 lettres, chiffres ou tirets."),
    kind: z.enum(["percent", "amount"]),
    value: z.coerce.number().positive("Remise invalide."),
    duration: z.enum(["once", "repeating", "forever"]),
    durationInMonths: z.coerce.number().int().min(1).max(36).optional(),
    maxRedemptions: z.coerce.number().int().min(1).optional(),
    expiresAt: z.coerce.date().optional(),
    firstTimeOnly: z.boolean().default(false),
  })
  .refine((v) => v.kind !== "percent" || v.value <= 100, {
    message: "Un pourcentage ne peut pas dépasser 100.",
    path: ["value"],
  })
  .refine((v) => v.duration !== "repeating" || !!v.durationInMonths, {
    message: "Précisez le nombre de mois.",
    path: ["durationInMonths"],
  });

/** Crée un code promo utilisable dans Stripe Checkout. */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  if (!getStripe())
    return apiError("INTERNAL_ERROR", "Stripe n'est pas configuré.", undefined, 503);

  const validation = await validateBody(promotionSchema, request);
  if (!validation.success) return validation.response;
  const input = validation.data;

  return withStripeErrors(async () => {
    const promotion = await createPromotionCode({
      code: input.code,
      ...(input.kind === "percent"
        ? { percentOff: input.value }
        : { amountOffCents: Math.round(input.value * 100) }),
      duration: input.duration,
      durationInMonths: input.durationInMonths,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt,
      firstTimeOnly: input.firstTimeOnly,
    });
    await logAuditEvent({
      userId: session.user.id,
      action: "admin.create_promotion_code",
      entityType: "promotion_code",
      entityId: promotion.id,
      metadata: {
        code: input.code,
        kind: input.kind,
        value: input.value,
        duration: input.duration,
      },
      ip,
      userAgent,
    });
    return apiSuccess({ id: promotion.id }, `Code ${input.code} créé.`, 201);
  });
});
