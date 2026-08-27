import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { readingActivity } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { readingActivitySchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const writeLimiter = createRateLimiter("reading-activity-write", 120, 60);
const readLimiter = createRateLimiter("reading-activity-read", 60, 60);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Date du jour au format `YYYY-MM-DD`. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Enregistre les pages lues pour un jour donné. Une seule ligne existe par utilisateur et
 * par jour : réenvoyer le même jour remplace la valeur au lieu d'ajouter une ligne, ce qui
 * permet de corriger une saisie.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await writeLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(readingActivitySchema, request);
  if (!validation.success) return validation.response;
  const { pagesRead, date } = validation.data;

  const [activity] = await db
    .insert(readingActivity)
    .values({ userId: session.user.id, date: date ?? today(), pagesRead })
    .onConflictDoUpdate({
      target: [readingActivity.userId, readingActivity.date],
      set: { pagesRead },
    })
    .returning();

  return apiSuccess(activity, "Activité enregistrée.", 201);
});

/**
 * Renvoie l'activité de lecture, éventuellement bornée par `startDate` et `endDate`
 * (`YYYY-MM-DD`). Non paginé : l'appelant est le graphe de contribution, qui a besoin de
 * toute la période affichée d'un seul tenant, et une ligne par jour reste peu volumineux.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await readLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if ((startDate && !DATE_PATTERN.test(startDate)) || (endDate && !DATE_PATTERN.test(endDate))) {
    return apiError("VALIDATION_ERROR", "Dates attendues au format YYYY-MM-DD.");
  }

  const activities = await db.query.readingActivity.findMany({
    where: and(
      eq(readingActivity.userId, session.user.id),
      startDate ? gte(readingActivity.date, startDate) : undefined,
      endDate ? lte(readingActivity.date, endDate) : undefined,
    ),
    orderBy: (activity, { desc }) => [desc(activity.date)],
  });

  return apiSuccess(activities);
});
