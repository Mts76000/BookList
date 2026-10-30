import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { toCsv } from "@/lib/csv";

const exportLimiter = createRateLimiter("books-export", 10, 60);

/** Colonnes du format d'import BookList : le fichier exporté se réimporte tel quel. */
const COLUMNS = [
  "title",
  "author",
  "isbn",
  "description",
  "coverUrl",
  "pageCount",
  "genre",
  "publishedDate",
  "userRating",
  "userStartDate",
  "userEndDate",
  "status",
  "currentPage",
  "format",
  "tags",
  "seriesName",
  "seriesIndex",
  "seriesTotal",
] as const;

function day(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/**
 * Exporte toute la bibliothèque en CSV, gratuitement et sans limite : ses données
 * appartiennent à l'utilisateur, même au-delà de la limite du compte gratuit.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await exportLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop d'exports. Réessayez dans une minute.");
  }

  const books = await db
    .select()
    .from(book)
    .where(eq(book.userId, session.user.id))
    .orderBy(asc(book.title));

  const csv = toCsv([
    [...COLUMNS],
    ...books.map((entry) => [
      entry.title,
      entry.author,
      entry.isbn,
      entry.description,
      entry.coverUrl,
      entry.pageCount,
      entry.genre,
      entry.publishedDate,
      entry.userRating,
      day(entry.userStartDate),
      day(entry.userEndDate),
      entry.status,
      entry.currentPage,
      entry.format,
      entry.tags?.join(", "),
      entry.seriesName,
      entry.seriesIndex,
      entry.seriesTotal,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="booklist-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
});
