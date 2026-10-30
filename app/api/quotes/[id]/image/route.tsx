import { ImageResponse } from "next/og";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, quote } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { env } from "@/lib/env";
import { getLogoMark } from "@/lib/pwa-icon";
import { getUserPlan } from "@/lib/subscription";
import { REVIEW_THEMES } from "@/lib/review-themes";

const imageLimiter = createRateLimiter("quote-image", 20, 60);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Corps de texte adapté à la longueur, pour qu'une longue citation tienne dans l'image. */
function fontSizeFor(length: number): number {
  if (length < 120) return 64;
  if (length < 280) return 52;
  if (length < 500) return 42;
  return 34;
}

/**
 * Image carrée d'une citation (format publication Instagram), réservée à Premium. Le style
 * reprend la palette « Nuit » du bilan, la plus lisible pour un texte long.
 */
export const GET = withApiErrorHandling(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await imageLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  if (!(await getUserPlan(session.user.id)).isPremium) {
    return apiError("FORBIDDEN", "Les images de citation sont réservées à Premium.");
  }

  const [entry] = await db
    .select({ content: quote.content, page: quote.page, title: book.title, author: book.author })
    .from(quote)
    .innerJoin(book, eq(book.id, quote.bookId))
    .where(and(eq(quote.id, id), eq(quote.userId, session.user.id)));
  if (!entry) return apiError("NOT_FOUND", "Citation introuvable.");

  const theme = REVIEW_THEMES.nuit;
  const text = entry.content.length > 700 ? `${entry.content.slice(0, 697)}...` : entry.content;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: theme.background,
        color: theme.ink,
        padding: 96,
      }}
    >
      <div style={{ display: "flex", fontSize: 160, lineHeight: 1, color: theme.accent }}>“</div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          fontSize: fontSizeFor(text.length),
          lineHeight: 1.35,
        }}
      >
        {text}
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>{entry.title}</div>
        <div style={{ display: "flex", fontSize: 30, color: theme.muted, marginTop: 8 }}>
          {entry.author}
          {entry.page !== null ? `, page ${entry.page}` : ""}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 56,
          fontSize: 28,
          color: theme.muted,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori ne rend que <img> */}
        <img src={getLogoMark()} width={46} height={30} alt="" />
        <div style={{ display: "flex" }}>{new URL(env.NEXT_PUBLIC_APP_URL).host}</div>
      </div>
    </div>,
    { width: 1080, height: 1080, headers: { "Cache-Control": "private, no-store" } },
  );
});
