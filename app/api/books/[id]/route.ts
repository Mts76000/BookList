import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { updateBookSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const updateLimiter = createRateLimiter("books-update", 60, 60);
const deleteLimiter = createRateLimiter("books-delete", 30, 60);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await updateLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(updateBookSchema, request);
  if (!validation.success) return validation.response;

  // La condition porte sur (id, userId) : le livre de quelqu'un d'autre est introuvable et
  // non interdit — on ne révèle pas son existence.
  const [updated] = await db
    .update(book)
    .set(validation.data)
    .where(and(eq(book.id, id), eq(book.userId, session.user.id)))
    .returning();

  if (!updated) return apiError("NOT_FOUND", "Livre introuvable.");

  return apiSuccess(updated, "Livre mis à jour.");
});

export const DELETE = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await deleteLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  // Suppression physique, en cascade sur les notes (voir drizzle/schema/books.ts).
  const [deleted] = await db
    .delete(book)
    .where(and(eq(book.id, id), eq(book.userId, session.user.id)))
    .returning({ id: book.id });

  if (!deleted) return apiError("NOT_FOUND", "Livre introuvable.");

  return apiSuccess(null, "Livre supprimé.");
});
