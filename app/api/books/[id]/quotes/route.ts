import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, quote } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { quoteSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { getUserPlan } from "@/lib/subscription";
import { FREE_QUOTE_LIMIT } from "@/lib/plans";

const quoteLimiter = createRateLimiter("book-quotes", 60, 60);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Enregistre une citation sur un livre de sa bibliothèque. Un compte gratuit est limité à
 * `FREE_QUOTE_LIMIT` citations au total ; celles déjà enregistrées restent accessibles.
 */
export const POST = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await quoteLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de citations. Réessayez dans une minute.");
  }

  const validation = await validateBody(quoteSchema, request);
  if (!validation.success) return validation.response;

  const owned = await db.query.book.findFirst({
    where: and(eq(book.id, id), eq(book.userId, session.user.id)),
    columns: { id: true },
  });
  if (!owned) return apiError("NOT_FOUND", "Livre introuvable.");

  const plan = await getUserPlan(session.user.id);
  if (!plan.isPremium) {
    const [{ value: quoteCount }] = await db
      .select({ value: count() })
      .from(quote)
      .where(eq(quote.userId, session.user.id));
    if (quoteCount >= FREE_QUOTE_LIMIT) {
      return apiError(
        "FORBIDDEN",
        `Le compte gratuit est limité à ${FREE_QUOTE_LIMIT} citations. Passez à Premium pour en enregistrer autant que vous voulez.`,
        { reason: "QUOTE_LIMIT_REACHED", limit: FREE_QUOTE_LIMIT },
      );
    }
  }

  const [created] = await db
    .insert(quote)
    .values({ ...validation.data, bookId: id, userId: session.user.id })
    .returning();

  return apiSuccess(created, "Citation enregistrée.", 201);
});
