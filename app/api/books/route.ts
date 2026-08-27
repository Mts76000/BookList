import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { createBookSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const createLimiter = createRateLimiter("books-create", 30, 60);
const listLimiter = createRateLimiter("books-list", 60, 60);

/** Ajoute un livre à la bibliothèque de l'utilisateur courant. */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await createLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const validation = await validateBody(createBookSchema, request);
  if (!validation.success) return validation.response;
  const fields = validation.data;

  // Ré-ajouter un livre déjà présent n'est pas une erreur : rescanner un code-barres déjà
  // scanné renvoie simplement le livre existant, plutôt qu'un conflit à gérer côté client.
  if (fields.isbn) {
    const existing = await db.query.book.findFirst({
      where: and(eq(book.userId, session.user.id), eq(book.isbn, fields.isbn)),
    });
    if (existing) return apiSuccess(existing, "Ce livre est déjà dans votre bibliothèque.");
  }

  const [created] = await db
    .insert(book)
    .values({ ...fields, userId: session.user.id })
    .returning();

  return apiSuccess(created, "Livre ajouté.", 201);
});

/**
 * Renvoie l'identifiant et l'ISBN de tous les livres de l'utilisateur.
 *
 * Volontairement non paginé, contrairement à la règle générale du socle : l'unique appelant
 * est l'écran d'ajout, qui construit une table ISBN → id pour signaler d'un coup d'œil les
 * résultats de recherche déjà possédés. Une réponse partielle y afficherait comme absents
 * des livres pourtant en bibliothèque. La charge reste faible (deux colonnes, et une
 * bibliothèque personnelle se compte en centaines de lignes).
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await listLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const books = await db
    .select({ id: book.id, isbn: book.isbn })
    .from(book)
    .where(eq(book.userId, session.user.id));

  return apiSuccess(books);
});
