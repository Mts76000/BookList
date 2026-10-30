import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, yearFavorite } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { yearFavoriteSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const favoriteLimiter = createRateLimiter("year-favorite", 30, 60);

/**
 * Choisit le coup de cœur d'une année. Le livre doit appartenir à l'utilisateur et avoir été
 * terminé cette année-là : le bilan ne présente que les lectures de l'année.
 */
export const PUT = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await favoriteLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(yearFavoriteSchema, request);
  if (!validation.success) return validation.response;
  const { year, bookId } = validation.data;

  const owned = await db.query.book.findFirst({
    where: and(eq(book.id, bookId), eq(book.userId, session.user.id)),
    columns: { userEndDate: true, status: true },
  });
  // Même réponse pour un livre inexistant ou appartenant à un autre : ne pas révéler son
  // existence.
  if (!owned) return apiError("NOT_FOUND", "Livre introuvable.");
  if (
    owned.status === "ABANDONED" ||
    !owned.userEndDate ||
    new Date(owned.userEndDate).getFullYear() !== year
  ) {
    return apiError("VALIDATION_ERROR", `Ce livre n'a pas été terminé en ${year}.`);
  }

  const [favorite] = await db
    .insert(yearFavorite)
    .values({ userId: session.user.id, year, bookId })
    .onConflictDoUpdate({
      target: [yearFavorite.userId, yearFavorite.year],
      set: { bookId },
    })
    .returning();

  return apiSuccess(favorite, "Coup de cœur enregistré.");
});

/** Revient au choix automatique (le livre le mieux noté) pour l'année `?year=`. */
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await favoriteLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year)) return apiError("VALIDATION_ERROR", "Année invalide.");

  await db
    .delete(yearFavorite)
    .where(and(eq(yearFavorite.userId, session.user.id), eq(yearFavorite.year, year)));

  return apiSuccess(null, "Coup de cœur automatique rétabli.");
});
