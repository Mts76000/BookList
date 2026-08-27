import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { session as sessionTable, user } from "@/drizzle/schema";
import { requireRole } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Révoque toutes les sessions d'un utilisateur, qui se retrouve déconnecté partout.
 * Utile en cas de compte compromis, sans avoir à supprimer quoi que ce soit.
 */
export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const adminSession = await requireRole("admin");
  const { ip, userAgent } = requestMetadata(request);

  // Se révoquer soi-même déconnecterait l'administrateur en pleine opération : il dispose
  // pour cela de la gestion de ses propres sessions sur sa page Compte.
  if (id === adminSession.user.id) {
    return apiError("FORBIDDEN", "Gérez vos propres sessions depuis votre page Compte.");
  }

  const target = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!target) return apiError("NOT_FOUND", "Utilisateur introuvable.");

  const revoked = await db
    .delete(sessionTable)
    .where(eq(sessionTable.userId, id))
    .returning({ id: sessionTable.id });

  await logAuditEvent({
    userId: adminSession.user.id,
    action: "admin.revoke_sessions",
    entityType: "user",
    entityId: id,
    metadata: { email: target.email, revoked: revoked.length },
    ip,
    userAgent,
  });

  return apiSuccess({ revoked: revoked.length }, `${revoked.length} session(s) révoquée(s).`);
});
