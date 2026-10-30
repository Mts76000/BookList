import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { getUserPlan } from "@/lib/subscription";
import { inSeries } from "@/lib/series-store";
import { findSeriesForTitles } from "@/lib/series-completion";
import { chooseSeries, missingVolumes } from "@/lib/series-detection";

const missingLimiter = createRateLimiter("series-missing", 60, 60);

/**
 * Tomes d'une saga de l'utilisateur absents de sa bibliothèque, d'après Wikidata.
 *
 * Tout compte connaît le nombre de tomes de la saga et combien lui en manquent ; la liste
 * des tomes manquants, pour les ajouter en un clic, est réservée à Premium et ne quitte pas
 * le serveur pour un compte gratuit.
 *
 * `found: false` quand Wikidata ne connaît pas la saga, ou qu'il ne répond pas : ce n'est pas
 * une erreur, la page Sagas reste simplement telle quelle.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const userId = session.user.id;
  const { ip } = requestMetadata(request);

  const rateLimit = await missingLimiter.check(`${ip ?? "unknown"}:${userId}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const name = new URL(request.url).searchParams.get("name")?.trim();
  if (!name) return apiError("VALIDATION_ERROR", "Le nom de la saga est requis.");

  const [sagaBooks, library, plan] = await Promise.all([
    db
      .select({ title: book.title, author: book.author, seriesIndex: book.seriesIndex })
      .from(book)
      .where(inSeries(userId, name))
      .orderBy(asc(book.seriesIndex)),
    db.select({ title: book.title }).from(book).where(eq(book.userId, userId)),
    getUserPlan(userId),
  ]);
  if (sagaBooks.length === 0) return apiError("NOT_FOUND", "Saga introuvable.");

  const series = chooseSeries(
    await findSeriesForTitles(sagaBooks.map((entry) => entry.title)),
    sagaBooks,
  );
  if (!series) return apiSuccess({ found: false });

  const missing = missingVolumes(
    series,
    sagaBooks,
    library.map((entry) => entry.title),
  );
  // L'auteur le plus présent dans la saga, pour les tomes ajoutés depuis Wikidata.
  const authorCounts = new Map<string, number>();
  for (const entry of sagaBooks) {
    authorCounts.set(entry.author, (authorCounts.get(entry.author) ?? 0) + 1);
  }
  const author = [...authorCounts].sort((a, b) => b[1] - a[1])[0][0];

  return apiSuccess({
    found: true,
    total: series.volumes.filter((volume) => volume.index !== null).length,
    missingCount: missing.length,
    missing: plan.isPremium ? missing : [],
    author,
  });
});
