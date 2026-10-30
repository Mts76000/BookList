import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { identifySeriesSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { findSeriesForTitles } from "@/lib/series-completion";
import { chooseSeries, missingVolumes, volumeForTitle } from "@/lib/series-detection";

const identifyLimiter = createRateLimiter("series-identify", 60, 60);

/**
 * Identifie sur Wikidata la saga de livres repérés ensemble dans la bibliothèque (voir la
 * page Sagas) : son vrai nom, son nombre de tomes, le numéro de chaque livre possédé et les
 * tomes qui manquent. La suggestion « Harry » devient « Harry Potter, 7 tomes, il vous en
 * manque 5 », prête à créer.
 *
 * Les titres viennent de la base, pas du client : seuls les livres de l'utilisateur sont
 * pris en compte. Les tomes manquants sont listés pour tous ; les ajouter en un clic est
 * réservé à Premium.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const userId = session.user.id;
  const { ip } = requestMetadata(request);

  const rateLimit = await identifyLimiter.check(`${ip ?? "unknown"}:${userId}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(identifySeriesSchema, request);
  if (!validation.success) return validation.response;

  const [books, library] = await Promise.all([
    db
      .select({ id: book.id, title: book.title, author: book.author })
      .from(book)
      .where(and(eq(book.userId, userId), inArray(book.id, validation.data.bookIds))),
    db.select({ title: book.title }).from(book).where(eq(book.userId, userId)),
  ]);
  if (books.length === 0) return apiError("NOT_FOUND", "Livre introuvable.");

  const sagaBooks = books.map((entry) => ({ title: entry.title, seriesIndex: null }));
  const series = chooseSeries(
    await findSeriesForTitles(books.map((entry) => entry.title)),
    sagaBooks,
  );
  if (!series) return apiSuccess({ found: false });

  const owned = books.map((entry) => ({
    bookId: entry.id,
    seriesIndex: volumeForTitle(series, entry.title)?.index ?? null,
  }));
  const missing = missingVolumes(
    series,
    owned.map(({ seriesIndex }) => ({ title: "", seriesIndex })),
    library.map((entry) => entry.title),
  );

  return apiSuccess({
    found: true,
    name: series.name,
    total: series.volumes.filter((volume) => volume.index !== null).length,
    owned,
    missingCount: missing.length,
    // Visible de tous, comme sur la page Sagas : seul l'ajout en un clic est Premium.
    missing,
    author: books[0].author,
  });
});
