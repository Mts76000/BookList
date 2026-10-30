import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { searchBooks } from "@/lib/book-search";

const searchLimiter = createRateLimiter("books-search", 30, 60);

/**
 * Recherche de livres par texte libre (`q`) ou par ISBN (`isbn`).
 *
 * Le catalogue partagé passe avant Google Books, dont le quota est limité (voir
 * `searchBooks`).
 *
 * Réservée aux utilisateurs connectés — la route consomme le quota de notre clé API, et son
 * seul appelant est l'écran d'ajout, lui-même protégé.
 *
 * Une indisponibilité de Google Books n'est pas une erreur de cette route : elle répond
 * quand même en succès, avec une liste vide et un motif dans `unavailable`, pour que l'écran
 * d'ajout bascule sur la saisie manuelle au lieu d'afficher une erreur sans issue.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await searchLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de recherches. Réessayez dans une minute.");
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const isbn = searchParams.get("isbn")?.replace(/[-\s]/g, "");

  if (!query && !isbn) {
    return apiError("VALIDATION_ERROR", "Un titre ou un ISBN est requis.");
  }

  const result = await searchBooks(isbn ? { isbn } : { q: query! });
  if (result.unavailable) {
    return apiSuccess({ books: [], unavailable: result.unavailable }, result.message);
  }
  return apiSuccess({ books: result.books, unavailable: null });
});
