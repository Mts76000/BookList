import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { createBookSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { getUserPlan } from "@/lib/subscription";
import { FREE_BOOK_LIMIT } from "@/lib/plans";
import { canonicalSeriesName } from "@/lib/series-store";
import { toIsbn10, toIsbn13 } from "@/lib/isbn";

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
    // Toujours stocké en ISBN-13 : un ancien ISBN-10 et son code-barres sont le même livre.
    fields.isbn = toIsbn13(fields.isbn) ?? fields.isbn;
    const forms = [fields.isbn, toIsbn10(fields.isbn)].filter((value): value is string => !!value);
    const existing = await db.query.book.findFirst({
      where: and(eq(book.userId, session.user.id), inArray(book.isbn, forms)),
    });
    if (existing) return apiSuccess(existing, "Ce livre est déjà dans votre bibliothèque.");
  }

  // Après le contrôle de doublon : rescanner un livre déjà possédé reste possible même
  // une fois la limite atteinte.
  const plan = await getUserPlan(session.user.id);
  if (plan.remaining <= 0) {
    return apiError(
      "FORBIDDEN",
      `Votre bibliothèque gratuite est pleine (${FREE_BOOK_LIMIT} livres). Passez à Premium pour continuer à ajouter des livres.`,
      { reason: "BOOK_LIMIT_REACHED", limit: FREE_BOOK_LIMIT },
    );
  }

  // Une saga déjà présente garde son orthographe : « dune » rejoint « Dune ».
  if (fields.seriesName) {
    fields.seriesName = await canonicalSeriesName(db, session.user.id, fields.seriesName);
  }

  const [created] = await db
    .insert(book)
    .values({ ...fields, userId: session.user.id, statusChangedAt: new Date() })
    .returning();

  return apiSuccess(created, "Livre ajouté.", 201);
});

/**
 * Renvoie de quoi reconnaître chaque livre de l'utilisateur : identifiant, ISBN, titre et
 * auteur, plus la couverture et le nombre de pages pour proposer de compléter une fiche.
 *
 * Volontairement non paginé, contrairement à la règle générale du socle : l'unique appelant
 * est l'écran d'ajout, qui signale d'un coup d'œil les résultats de recherche déjà possédés
 * — même ISBN, ou même titre et même auteur quand le livre a été ajouté par son nom ou
 * sous une autre édition. Une réponse partielle y afficherait comme absents des livres
 * pourtant en bibliothèque. La charge reste faible (une bibliothèque personnelle se compte
 * en centaines de lignes).
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await listLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const books = await db
    .select({
      id: book.id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      pageCount: book.pageCount,
    })
    .from(book)
    .where(eq(book.userId, session.user.id));

  return apiSuccess(books);
});
