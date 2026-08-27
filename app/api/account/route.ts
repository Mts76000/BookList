import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { updateProfileSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";
import { anonymizeUser } from "@/lib/anonymize-user";

const profileLimiter = createRateLimiter("account-profile", 30, 60);

/**
 * Met à jour le profil de l'utilisateur courant : son nom d'affichage et le nombre de livres
 * lus avant son inscription.
 *
 * L'écriture passe par Drizzle et non par better-auth : `initialBooksRead` est déclaré en
 * `input: false` dans lib/auth.ts, précisément pour qu'il ne soit jamais modifiable depuis
 * le corps d'une requête d'authentification.
 */
export const PATCH = withApiErrorHandling(async (request: Request) => {
  const authSession = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await profileLimiter.check(`${ip ?? "unknown"}:${authSession.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de modifications. Réessayez dans une minute.");
  }

  const validation = await validateBody(updateProfileSchema, request);
  if (!validation.success) return validation.response;

  const [updated] = await db
    .update(user)
    .set(validation.data)
    .where(eq(user.id, authSession.user.id))
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      initialBooksRead: user.initialBooksRead,
    });

  return apiSuccess(updated, "Profil mis à jour.");
});

/**
 * Supprime le compte de l'utilisateur courant, par anonymisation et non par suppression
 * physique — dérogation assumée au défaut du socle, documentée dans AGENTS.md. Le détail de
 * l'opération vit dans lib/anonymize-user.ts, partagé avec la suppression administrative.
 */
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const authSession = await requireAuth();
  const { ip, userAgent } = requestMetadata(request);
  const userId = authSession.user.id;

  const current = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!current) return apiError("NOT_FOUND", "Utilisateur introuvable.");
  if (current.isAnonymized) return apiError("CONFLICT", "Ce compte est déjà supprimé.");

  await logAuditEvent({
    userId,
    action: "user.delete_account",
    entityType: "user",
    entityId: userId,
    metadata: { email: current.email },
    ip,
    userAgent,
  });

  await anonymizeUser(userId);

  return apiSuccess(null, "Compte supprimé.");
});
