import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { findSeriesForTitles } from "@/lib/series-completion";
import { chooseSeries, seriesLookupTitles, volumeForTitle } from "@/lib/series-detection";

const lookupLimiter = createRateLimiter("series-lookup", 30, 60);

const MAX_TITLE = 300;

/**
 * Saga d'un livre qu'on s'apprête à ajouter, d'après Wikidata : son nom, le numéro du livre
 * et le nombre de tomes. L'écran d'ajout s'en sert quand le titre seul ne dit rien de la
 * saga (« Harry Potter et la Chambre des secrets » ne porte pas de « tome 2 »).
 *
 * Simple lecture de métadonnées publiques, mises en cache partagé (voir
 * `findSeriesForTitles`) : rien n'est écrit dans la bibliothèque de l'utilisateur.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await lookupLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim().slice(0, MAX_TITLE);
  const subtitle = searchParams.get("subtitle")?.trim().slice(0, MAX_TITLE) || null;
  if (!title) return apiError("VALIDATION_ERROR", "Un titre est requis.");

  const titles = seriesLookupTitles(title, subtitle);
  const series = chooseSeries(
    await findSeriesForTitles(titles),
    titles.map((entry) => ({ title: entry, seriesIndex: null })),
  );
  if (!series) return apiSuccess({ found: false });

  const volume = titles.map((entry) => volumeForTitle(series, entry)).find(Boolean) ?? null;
  return apiSuccess({
    found: true,
    name: series.name,
    index: volume?.index ?? null,
    total: series.volumes.filter((entry) => entry.index !== null).length || null,
  });
});
