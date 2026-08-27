import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, comment } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { commentSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const commentLimiter = createRateLimiter("book-comments", 60, 60);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Ajoute une note personnelle sur un livre de sa propre bibliothèque. */
export const POST = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await commentLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de notes. Réessayez dans une minute.");
  }

  const validation = await validateBody(commentSchema, request);
  if (!validation.success) return validation.response;

  const owned = await db.query.book.findFirst({
    where: and(eq(book.id, id), eq(book.userId, session.user.id)),
    columns: { id: true },
  });
  if (!owned) return apiError("NOT_FOUND", "Livre introuvable.");

  const [created] = await db
    .insert(comment)
    .values({ content: validation.data.content, bookId: id, userId: session.user.id })
    .returning();

  return apiSuccess(created, "Note ajoutée.", 201);
});
