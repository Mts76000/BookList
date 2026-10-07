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

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Records a sensitive or important event. Reusable for any future business action, not
 * just the built-in auth events (password change, account deletion) it's wired to by
 * default.
 *
 * Without `tx`: never throws — audit logging must not break the caller's operation.
 * With `tx`: written inside the caller's transaction and errors propagate, so the audit
 * entry and the action it describes are committed or rolled back together.
 */
export async function logAuditEvent(entry: AuditLogEntry, tx?: Transaction): Promise<void> {
  const values = {
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
  };

  if (tx) {
    await tx.insert(auditLogs).values(values);
    return;
  }

  try {
    await db.insert(auditLogs).values(values);
  } catch (err) {
    logger.error({ err, entry }, "Failed to write audit log entry");
  }
}

/**
 * Resolves the client IP from proxy headers. Never trusts the *first* X-Forwarded-For
 * entry: the client controls it (Traefik/Coolify append to the header rather than
 * overwrite it), so using it would let anyone bypass IP-based rate limits. Prefers
 * X-Real-IP (set by the reverse proxy), then the last X-Forwarded-For entry (the one
 * appended by our own proxy). If another proxy/CDN sits in front (e.g. Cloudflare),
 * read its dedicated header here instead.
 */
export function getClientIp(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return forwarded?.at(-1) ?? null;
}

/** Extracts IP and user agent from a Request for audit log entries. */
export function requestMetadata(request: Request) {
  return {
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  };
}
