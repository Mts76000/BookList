import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { seriesEditionsSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { getUserPlan } from "@/lib/subscription";
import { findEdition, type Edition } from "@/lib/series-editions";

const editionsLimiter = createRateLimiter("series-editions", 30, 60);

/** Recherches d'éditions menées en même temps, pour ménager Google et Open Library. */
const CONCURRENCY = 3;

/**
 * Éditions des tomes manquants d'une saga, pour afficher leur couverture avant l'ajout et
 * les ajouter dans la même collection que les tomes possédés (voir lib/edition-match.ts).
 * Réservée à Premium, comme la liste des tomes manquants.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const userId = session.user.id;
  const { ip } = requestMetadata(request);

  const rateLimit = await editionsLimiter.check(`${ip ?? "unknown"}:${userId}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(seriesEditionsSchema, request);
  if (!validation.success) return validation.response;
  const { titles, author, referenceBookIds } = validation.data;

  if (!(await getUserPlan(userId)).isPremium) {
    return apiError("FORBIDDEN", "Les tomes manquants sont réservés à Premium.");
  }

  // Les ISBN de référence viennent des livres de l'utilisateur, jamais du client.
  const references =
    referenceBookIds.length > 0
      ? await db
          .select({ isbn: book.isbn })
          .from(book)
          .where(
            and(eq(book.userId, userId), inArray(book.id, referenceBookIds), isNotNull(book.isbn)),
          )
      : [];
  const preferred = references.map((entry) => entry.isbn!);

  const editions: (Edition | null)[] = new Array(titles.length).fill(null);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, titles.length) }, async () => {
      while (next < titles.length) {
        const index = next++;
        editions[index] = await findEdition(titles[index], author, preferred);
      }
    }),
  );

  return apiSuccess({ editions });
});
