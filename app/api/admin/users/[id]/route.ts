import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { requireRole } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";
import { anonymizeUser } from "@/lib/anonymize-user";

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Change le rôle d'un utilisateur. */
export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  // Garde-fou : sans lui, le dernier administrateur peut se retirer son propre rôle et
  // verrouiller le back-office pour tout le monde, sans aucun moyen d'y revenir depuis l'app.
  if (id === session.user.id) {
    return apiError("FORBIDDEN", "Vous ne pouvez pas modifier votre propre rôle.");
  }

  const validation = await validateBody(updateRoleSchema, request);
  if (!validation.success) return validation.response;

  const target = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!target) return apiError("NOT_FOUND", "Utilisateur introuvable.");
  if (target.isAnonymized) {
    return apiError("CONFLICT", "Ce compte est supprimé, son rôle ne peut plus changer.");
  }

  await db.update(user).set({ role: validation.data.role }).where(eq(user.id, id));

  await logAuditEvent({
    userId: session.user.id,
    action: "admin.change_role",
    entityType: "user",
    entityId: id,
    metadata: { email: target.email, from: target.role, to: validation.data.role },
    ip,
    userAgent,
  });

  return apiSuccess({ id, role: validation.data.role }, "Rôle mis à jour.");
});

/** Supprime un compte utilisateur, par anonymisation (voir lib/anonymize-user.ts). */
export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  // Un administrateur supprime son propre compte depuis /account, comme tout le monde : ce
  // n'est pas une action d'administration, et l'interdire ici évite de se déconnecter soi-même
  // au milieu d'une opération de modération.
  if (id === session.user.id) {
    return apiError("FORBIDDEN", "Supprimez votre propre compte depuis votre page Compte.");
  }

  const target = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!target) return apiError("NOT_FOUND", "Utilisateur introuvable.");
  if (target.isAnonymized) return apiError("CONFLICT", "Ce compte est déjà supprimé.");

  // Journalisé avant l'opération : l'adresse e-mail n'existera plus après.
  await logAuditEvent({
    userId: session.user.id,
    action: "admin.delete_account",
    entityType: "user",
    entityId: id,
    metadata: { email: target.email },
    ip,
    userAgent,
  });

  await anonymizeUser(id);

  return apiSuccess(null, "Compte supprimé.");
});
