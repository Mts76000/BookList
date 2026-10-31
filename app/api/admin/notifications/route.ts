import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushSubscription, user } from "@/drizzle/schema";
import { requireRole } from "@/lib/permissions";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";
import { isPushEnabled, sendPushToUser } from "@/lib/push";
import { createRateLimiter } from "@/lib/rate-limit";

const notificationLimiter = createRateLimiter("admin-notifications", 10, 60);

const notificationSchema = z.object({
  /** `me` : l'administrateur lui-même ; `user` : un compte, par e-mail ; `all` : tous. */
  target: z.enum(["me", "user", "all"]),
  email: z.string().trim().toLowerCase().optional(),
  title: z.string().trim().min(1, "Le titre est requis.").max(80),
  body: z.string().trim().min(1, "Le message est requis.").max(240),
  // Chemin interne seulement : une notification ne doit pas ouvrir un site tiers.
  url: z
    .string()
    .trim()
    .regex(/^\/(?!\/)/, "Un chemin de l'application, commençant par /.")
    .max(200)
    .default("/dashboard"),
});

/**
 * Envoi d'une notification push depuis l'administration : pour tester les rappels sur son
 * propre appareil, écrire à un lecteur, ou annoncer une nouveauté à tous les abonnés aux
 * notifications. Chaque envoi est journalisé.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  const rateLimit = await notificationLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop d'envois. Réessayez dans une minute.");
  }

  if (!isPushEnabled()) {
    return apiError(
      "INTERNAL_ERROR",
      "Les notifications ne sont pas configurées (clés VAPID absentes).",
      undefined,
      503,
    );
  }

  const validation = await validateBody(notificationSchema, request);
  if (!validation.success) return validation.response;
  const { target, email, title, body, url } = validation.data;

  let recipients: string[];
  if (target === "me") {
    recipients = [session.user.id];
  } else if (target === "user") {
    if (!email) return apiError("VALIDATION_ERROR", "Indiquez l'e-mail du destinataire.");
    const found = await db.query.user.findFirst({
      where: eq(user.email, email),
      columns: { id: true },
    });
    if (!found) return apiError("NOT_FOUND", "Aucun compte avec cet e-mail.");
    recipients = [found.id];
  } else {
    const rows = await db.selectDistinct({ id: pushSubscription.userId }).from(pushSubscription);
    recipients = rows.map((row) => row.id);
  }

  let sent = 0;
  for (const recipient of recipients) {
    sent += await sendPushToUser(recipient, { title, body, url });
  }

  await logAuditEvent({
    userId: session.user.id,
    action: "admin.send_notification",
    entityType: target === "all" ? "notification" : "user",
    entityId: target === "all" ? undefined : recipients[0],
    metadata: { target, email: target === "user" ? email : undefined, title, sent },
    ip,
    userAgent,
  });

  return apiSuccess(
    { recipients: recipients.length, sent },
    sent > 0
      ? `Notification envoyée sur ${sent} appareil${sent > 1 ? "s" : ""}.`
      : "Aucun appareil abonné aux notifications pour ce destinataire.",
  );
});
