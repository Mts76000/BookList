import { after } from "next/server";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { createBookSchema, importBooksSchema } from "@/lib/validation-schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { csvRowsToObjects, parseCsv } from "@/lib/csv";
import { detectImportFormat, toBookListRow } from "@/lib/import-formats";
import { enrichLibrary } from "@/lib/library-enrichment";
import { logger } from "@/lib/logger";
import { catalogBook } from "@/drizzle/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

const importLimiter = createRateLimiter("books-import", 5, 10 * 60);

// Une bibliothèque Goodreads de lecteur assidu dépasse vite les 500 livres. 2000 lignes de
// 14 colonnes restent sous la limite de 65 535 paramètres d'un INSERT Postgres.
const MAX_ROWS = 2000;

/** Livres complétés juste après l'import ; les suivants le sont par la tâche planifiée. */
const AFTER_IMPORT_BATCH = 60;

/**
 * Importe des livres depuis un CSV : le modèle BookList (colonnes title, author, isbn,
 * description, coverUrl, pageCount, genre, publishedDate, userRating, userStartDate,
 * userEndDate, status), ou tel quel un export Goodreads ou StoryGraph, reconnu à son en-tête
 * (voir `lib/import-formats.ts`).
 *
 * Ces exports n'ont ni couverture ni résumé : on les complète depuis le catalogue partagé
 * quand l'ISBN y est déjà, sans aucun appel à Google Books. Les autres sont complétés après
 * la réponse auprès des sources de livres, un premier lot tout de suite, la suite par la
 * tâche planifiée `/api/cron/enrich-library`.
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

  const table = parseCsv(validation.data.csv);
  const format = detectImportFormat(table[0] ?? []);
  const rows = csvRowsToObjects(table).map((row) => toBookListRow(format, row));

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

  // Les doublons d'ISBN déjà en bibliothèque sont écartés : réimporter un export complet ne
  // doit pas dupliquer la bibliothèque.
  const owned = await db
    .select({ isbn: book.isbn })
    .from(book)
    .where(and(eq(book.userId, session.user.id), isNotNull(book.isbn)));
  const ownedIsbns = new Set(owned.map((entry) => entry.isbn));
  const seen = new Set<string>();
  const fresh = toCreate.filter((entry) => {
    if (!entry.isbn) return true;
    if (ownedIsbns.has(entry.isbn) || seen.has(entry.isbn)) return false;
    seen.add(entry.isbn);
    return true;
  });

  // L'import n'est pas soumis à la limite du compte gratuit : on arrive avec toute sa
  // bibliothèque, sans en laisser une partie de côté. La limite ne s'applique qu'aux ajouts
  // suivants, un par un (voir POST /api/books).
  const accepted = fresh;

  await fillFromCatalog(accepted);

  let imported = 0;
  if (accepted.length > 0) {
    // Les doublons d'ISBN déjà en bibliothèque sont ignorés silencieusement : réimporter
    // un export complet ne doit pas dupliquer la bibliothèque.
    const inserted = await db
      .insert(book)
      .values(accepted)
      .onConflictDoNothing({ target: [book.userId, book.isbn] })
      .returning({ id: book.id });
    imported = inserted.length;
  }

  if (imported > 0) {
    const userId = session.user.id;
    after(() =>
      enrichLibrary({ userId, limit: AFTER_IMPORT_BATCH }).catch((err: unknown) =>
        logger.error({ err }, "Library enrichment after import failed"),
      ),
    );
  }

  return apiSuccess(
    {
      format,
      imported,
      skipped: toCreate.length - fresh.length + (accepted.length - imported),
      failed: errors.length,
      errors,
    },
    `${imported} livre(s) importé(s).`,
  );
});

/** Complète couverture, résumé, genre et pagination depuis le catalogue, sans écraser. */
async function fillFromCatalog(books: (typeof book.$inferInsert)[]): Promise<void> {
  const isbns = [...new Set(books.map((entry) => entry.isbn).filter((isbn) => !!isbn))];
  if (isbns.length === 0) return;

  const known = await db
    .select()
    .from(catalogBook)
    .where(inArray(catalogBook.isbn, isbns as string[]));
  const byIsbn = new Map(known.map((entry) => [entry.isbn, entry]));

  for (const entry of books) {
    const match = entry.isbn ? byIsbn.get(entry.isbn) : undefined;
    if (!match) continue;
    entry.coverUrl ??= match.coverUrl;
    entry.description ??= match.description;
    entry.genre ??= match.genres?.[0] ?? null;
    entry.pageCount ??= match.pageCount;
    entry.publishedDate ??= match.publishedDate;
  }
}
