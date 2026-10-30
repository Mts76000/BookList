import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, readingActivity } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { progressSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const progressLimiter = createRateLimiter("book-progress", 60, 60);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Met à jour la page où l'on en est d'un livre. Les pages gagnées depuis la dernière mise à
 * jour s'ajoutent à l'activité du jour : une seule saisie alimente à la fois la progression
 * du livre, le graphe de lecture et la série de jours. Un livre « à lire » passe « en cours ».
 *
 * Revenir en arrière (relecture, erreur de saisie) corrige la page sans retirer de pages de
 * la journée : l'activité ne compte que ce qui a été lu.
 */
export const POST = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await progressLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(progressSchema, request);
  if (!validation.success) return validation.response;

  const result = await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({
        currentPage: book.currentPage,
        pageCount: book.pageCount,
        status: book.status,
        userStartDate: book.userStartDate,
      })
      .from(book)
      .where(and(eq(book.id, id), eq(book.userId, session.user.id)))
      .for("update");
    if (!owned) return null;

    const page = owned.pageCount
      ? Math.min(validation.data.currentPage, owned.pageCount)
      : validation.data.currentPage;
    const pagesLogged = Math.max(page - (owned.currentPage ?? 0), 0);

    await tx
      .update(book)
      .set({
        currentPage: page,
        ...(owned.status === "TO_READ" ? { status: "READING" as const } : {}),
        ...(!owned.userStartDate ? { userStartDate: new Date() } : {}),
      })
      .where(eq(book.id, id));

    if (pagesLogged > 0) {
      await tx
        .insert(readingActivity)
        .values({
          userId: session.user.id,
          date: new Date().toISOString().slice(0, 10),
          pagesRead: pagesLogged,
        })
        .onConflictDoUpdate({
          target: [readingActivity.userId, readingActivity.date],
          set: { pagesRead: sql`${readingActivity.pagesRead} + ${pagesLogged}` },
        });
    }

    return {
      currentPage: page,
      pagesLogged,
      reachedEnd: owned.pageCount !== null && page >= owned.pageCount,
    };
  });

  if (!result) return apiError("NOT_FOUND", "Livre introuvable.");
  return apiSuccess(
    result,
    result.pagesLogged > 0
      ? `${result.pagesLogged} page${result.pagesLogged > 1 ? "s" : ""} ajoutée${result.pagesLogged > 1 ? "s" : ""} à votre journée.`
      : "Progression mise à jour.",
  );
});
