import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { deleteSeriesSchema, saveSeriesSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { canonicalSeriesName, getKnownSeries, inSeries } from "@/lib/series-store";

const seriesLimiter = createRateLimiter("series", 30, 60);

const SERIES_RESET = { seriesName: null, seriesIndex: null, seriesTotal: null };

/**
 * Sagas de la bibliothèque, avec le tome suivant et leurs auteurs : l'écran d'ajout s'en
 * sert pour proposer de ranger le nouveau livre dans la bonne saga.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await seriesLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  return apiSuccess(await getKnownSeries(session.user.id));
});

/**
 * Crée ou modifie une saga en une fois : ses tomes et leur numéro. Une saga n'est pas une
 * table à part, seulement le nom de série porté par ses livres : cette route écrit ces
 * champs sur chaque tome, dans une transaction pour ne jamais laisser une saga à moitié
 * renommée.
 *
 * - Création (`previousName` absent) : si une saga porte déjà ce nom, les livres la
 *   rejoignent, sous son orthographe existante.
 * - Modification : les livres de l'ancienne saga absents de la liste en sortent ; un
 *   nouveau nom la renomme.
 */
export const PUT = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const userId = session.user.id;
  const { ip } = requestMetadata(request);

  const rateLimit = await seriesLimiter.check(`${ip ?? "unknown"}:${userId}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(saveSeriesSchema, request);
  if (!validation.success) return validation.response;
  const { name, previousName, total, volumes } = validation.data;
  const bookIds = [...new Set(volumes.map((volume) => volume.bookId))];

  const saved = await db.transaction(async (tx) => {
    // Le livre de quelqu'un d'autre est introuvable, comme sur les autres routes livres.
    const owned = await tx
      .select({ id: book.id })
      .from(book)
      .where(and(eq(book.userId, userId), inArray(book.id, bookIds)));
    if (owned.length !== bookIds.length) return null;

    const renamed = previousName && previousName.toLowerCase() !== name.toLowerCase();
    const seriesName =
      renamed || !previousName ? await canonicalSeriesName(tx, userId, name) : name;

    if (previousName) {
      await tx
        .update(book)
        .set(SERIES_RESET)
        .where(and(inSeries(userId, previousName), notInArray(book.id, bookIds)));
    }
    for (const volume of volumes) {
      await tx
        .update(book)
        .set({ seriesName, seriesIndex: volume.seriesIndex })
        .where(and(eq(book.id, volume.bookId), eq(book.userId, userId)));
    }
    // Le nombre de tomes vaut pour toute la saga, y compris les livres qu'elle comptait déjà.
    await tx.update(book).set({ seriesTotal: total }).where(inSeries(userId, seriesName));

    return { name: seriesName };
  });

  if (!saved) return apiError("NOT_FOUND", "Livre introuvable.");
  return apiSuccess(saved, `Saga « ${saved.name} » enregistrée.`);
});

/** Défait une saga : ses livres restent dans la bibliothèque, sans série. */
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await seriesLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(deleteSeriesSchema, request);
  if (!validation.success) return validation.response;

  await db.update(book).set(SERIES_RESET).where(inSeries(session.user.id, validation.data.name));
  return apiSuccess(null, "Saga défaite. Ses livres restent dans votre bibliothèque.");
});
