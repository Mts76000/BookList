import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";

/**
 * Deletes the current user's account.
 *
 * Hard delete by default: this generic starter has no confirmed need for account
 * restoration (see CLAUDE.md's soft-vs-hard-delete rule — soft delete is never a default,
 * it must be justified per entity). Sessions and OAuth accounts cascade-delete via FK; this
 * project's audit_logs.userId is set to NULL on delete (see drizzle/schema/audit-log.ts) so
 * the audit trail survives with the user's email preserved in metadata.
 *
 * If a future project needs restoration (e.g. GDPR-driven "undo delete" window), add a
 * `deletedAt` column to `user` and swap this hard delete for a soft delete + a scheduled
 * hard-delete cron — do not add it here speculatively.
 */
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip, userAgent } = requestMetadata(request);

  await logAuditEvent({
    userId: session.user.id,
    action: "user.delete_account",
    entityType: "user",
    entityId: session.user.id,
    metadata: { email: session.user.email },
    ip,
    userAgent,
  });

  await db.delete(user).where(eq(user.id, session.user.id));

  return apiSuccess(null, "Compte supprimé.");
});
