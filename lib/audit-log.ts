import { db } from "@/lib/db";
import { auditLogs } from "@/drizzle/schema";
import { logger } from "@/lib/logger";

export interface AuditLogEntry {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Records a sensitive or important event. Reusable for any future business action, not
 * just the built-in auth events (account deletion, email change, password change, admin
 * actions) it's wired to by default. Never throws — audit logging must not break the
 * caller's actual operation.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    logger.error({ err, entry }, "Failed to write audit log entry");
  }
}

/** Extracts IP and user agent from a Request for audit log entries. */
export function requestMetadata(request: Request) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}
