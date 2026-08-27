import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { createBookSchema, importBooksSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { csvRowsToObjects, parseCsv } from "@/lib/csv";
import { z } from "zod";

const importLimiter = createRateLimiter("books-import", 5, 10 * 60);

const MAX_ROWS = 500;

/**
 * Importe des livres depuis un CSV (colonnes title, author, isbn, description, coverUrl,
 * pageCount, genre, publishedDate, userRating, userStartDate, userEndDate, status).
 *
 * Import partiel assumé : les lignes valides sont enregistrées même si d'autres échouent, et
 * la réponse détaille les lignes en erreur avec leur numéro. Refuser tout le fichier pour une
 * seule ligne mal formée obligerait à recommencer un import de plusieurs centaines de lignes.
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await importLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop d'imports. Réessayez dans quelques minutes.");
  }

  const validation = await validateBody(importBooksSchema, request);
  if (!validation.success) return validation.response;

  const rows = csvRowsToObjects(parseCsv(validation.data.csv));

  if (rows.length === 0) {
    return apiError("VALIDATION_ERROR", "Aucune ligne à importer.");
  }
  if (rows.length > MAX_ROWS) {
    return apiError("VALIDATION_ERROR", `Trop de lignes (${MAX_ROWS} maximum par import).`);
  }

  const toCreate: (typeof book.$inferInsert)[] = [];
  const errors: { line: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const parsed = createBookSchema.safeParse(row);
    if (parsed.success) {
      toCreate.push({ ...parsed.data, userId: session.user.id });
    } else {
      errors.push({
        // +2 : une ligne pour l'en-tête, une pour l'index commençant à zéro. C'est le
        // numéro que l'utilisateur voit dans son tableur.
        line: index + 2,
        message: z.prettifyError(parsed.error),
      });
    }
  });

  let imported = 0;
  if (toCreate.length > 0) {
    // Les doublons d'ISBN déjà en bibliothèque sont ignorés silencieusement : réimporter
    // un export complet ne doit pas dupliquer la bibliothèque.
    const inserted = await db
      .insert(book)
      .values(toCreate)
      .onConflictDoNothing({ target: [book.userId, book.isbn] })
      .returning({ id: book.id });
    imported = inserted.length;
  }

  return apiSuccess(
    { imported, skipped: toCreate.length - imported, failed: errors.length, errors },
    `${imported} livre(s) importé(s).`,
  );
});
