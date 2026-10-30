import { and, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { seriesCatalog, seriesLookup } from "@/drizzle/schema";
import { fetchSeriesByTitle, type FetchedSeries } from "@/lib/wikidata";
import { normalizeText } from "@/lib/series-detection";
import { logger } from "@/lib/logger";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Une saga trouvée change rarement : on la redemande au bout d'un mois. */
const FOUND_TTL_MS = 30 * DAY_MS;
/** Un titre sans saga est redemandé plus tôt : Wikidata se complète au fil du temps. */
const EMPTY_TTL_MS = 7 * DAY_MS;
/** Titres d'une saga interrogés au plus, pour borner les appels à Wikidata. */
const MAX_TITLES = 3;

/**
 * Sagas Wikidata contenant au moins un des titres, depuis le cache partagé, Wikidata n'étant
 * interrogé que pour les titres jamais vus ou expirés. Une erreur réseau n'est pas mise en
 * cache : le titre sera redemandé à la prochaine visite.
 */
export async function findSeriesForTitles(titles: string[]): Promise<FetchedSeries[]> {
  const keys = [...new Set(titles.map(normalizeText).filter(Boolean))].slice(0, MAX_TITLES);
  if (keys.length === 0) return [];
  const titleByKey = new Map(titles.map((title) => [normalizeText(title), title]));

  const cached = await db
    .select()
    .from(seriesLookup)
    .where(and(inArray(seriesLookup.titleKey, keys), gt(seriesLookup.expiresAt, new Date())));
  const ids = new Set(cached.flatMap((row) => row.seriesIds));
  const missing = keys.filter((key) => !cached.some((row) => row.titleKey === key));

  await Promise.all(
    missing.map(async (key) => {
      let found: FetchedSeries[];
      try {
        found = await fetchSeriesByTitle(titleByKey.get(key) ?? key);
      } catch (err) {
        logger.warn({ err }, "Wikidata series lookup failed");
        return;
      }
      for (const entry of found) {
        ids.add(entry.id);
        await db
          .insert(seriesCatalog)
          .values({ id: entry.id, name: entry.name, volumes: entry.volumes })
          .onConflictDoUpdate({
            target: seriesCatalog.id,
            set: { name: entry.name, volumes: entry.volumes, fetchedAt: new Date() },
          });
      }
      const row = {
        titleKey: key,
        seriesIds: found.map((entry) => entry.id),
        expiresAt: new Date(Date.now() + (found.length > 0 ? FOUND_TTL_MS : EMPTY_TTL_MS)),
      };
      await db
        .insert(seriesLookup)
        .values(row)
        .onConflictDoUpdate({
          target: seriesLookup.titleKey,
          set: { seriesIds: row.seriesIds, expiresAt: row.expiresAt },
        });
    }),
  );

  if (ids.size === 0) return [];
  return db
    .select({ id: seriesCatalog.id, name: seriesCatalog.name, volumes: seriesCatalog.volumes })
    .from(seriesCatalog)
    .where(inArray(seriesCatalog.id, [...ids]));
}

/** Supprime les correspondances titre → saga expirées. Les sagas elles-mêmes restent. */
export async function purgeExpiredSeriesLookups(): Promise<number> {
  const deleted = await db.delete(seriesLookup).where(lt(seriesLookup.expiresAt, new Date()));
  return deleted.rowCount ?? 0;
}
