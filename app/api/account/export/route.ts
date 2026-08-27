import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, session as sessionTable } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { withApiErrorHandling } from "@/lib/api-response";

/**
 * Basic JSON export of the current user's data (GDPR portability). Enrich this per project
 * as business entities are added — this only covers the starter's built-in auth data.
 */
export const GET = withApiErrorHandling(async () => {
  const authSession = await requireAuth();

  const [userRow] = await db.select().from(user).where(eq(user.id, authSession.user.id));
  const sessions = await db
    .select({
      id: sessionTable.id,
      createdAt: sessionTable.createdAt,
      ipAddress: sessionTable.ipAddress,
      userAgent: sessionTable.userAgent,
    })
    .from(sessionTable)
    .where(eq(sessionTable.userId, authSession.user.id));

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: userRow,
    sessions,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=account-export.json",
    },
  });
});
