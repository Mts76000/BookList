import { ImageResponse } from "next/og";
import { requireAuth } from "@/lib/permissions";
import { apiError, withApiErrorHandling } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";
import { env } from "@/lib/env";
import { getLogoMark } from "@/lib/pwa-icon";
import { getYearReview } from "@/lib/year-review";
import { getUserPlan } from "@/lib/subscription";
import { REVIEW_THEMES, isReviewTheme } from "@/lib/review-themes";
import { coverToneFor } from "@/lib/generated-cover";
import { formatRating } from "@/lib/book-status";

const imageLimiter = createRateLimiter("year-review-image", 20, 60);

/** Format « story » (Instagram, TikTok, WhatsApp), le plus partagé sur mobile. */
const WIDTH = 1080;
const HEIGHT = 1920;

/**
 * Couverture du livre préféré, téléchargée ici et intégrée en data URI. Laisser Satori la
 * récupérer lui-même ferait échouer toute l'image au moindre hôte lent ou en erreur ; on
 * préfère une image sans couverture qu'une image qui ne se génère pas.
 */
async function inlineCover(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 1_500_000) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function plural(count: number, word: string): string {
  return `${count.toLocaleString("fr-FR")} ${word}${count > 1 ? "s" : ""}`;
}

/**
 * Image PNG du bilan annuel de l'utilisateur connecté, à partager en story. Privée : elle
 * n'est servie qu'à son propriétaire, qui la télécharge ou la partage lui-même.
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const session = await requireAuth();
  const { ip } = requestMetadata(request);

  const rateLimit = await imageLimiter.check(`${ip ?? "unknown"}:${session.user.id}`);
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de requêtes. Réessayez dans une minute.");
  }

  const { searchParams } = new URL(request.url);
  const currentYear = new Date().getFullYear();
  const year = Number(searchParams.get("year") ?? currentYear);
  if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
    return apiError("VALIDATION_ERROR", "Année invalide.");
  }

  const themeParam = searchParams.get("theme");
  const themeId = isReviewTheme(themeParam) ? themeParam : "classique";
  const theme = REVIEW_THEMES[themeId];
  // Un compte gratuit peut voir un style Premium en aperçu (`preview=1`), marqué comme tel ;
  // seule l'image propre, à partager, est réservée.
  const isPreview = searchParams.get("preview") === "1";
  if (theme.premium && !isPreview && !(await getUserPlan(session.user.id)).isPremium) {
    return apiError("FORBIDDEN", "Ce style de bilan est réservé à Premium.");
  }

  const review = await getYearReview(session.user.id, year);
  const cover = await inlineCover(review.favoriteBook?.coverUrl ?? null);
  const host = new URL(env.NEXT_PUBLIC_APP_URL).host;

  const facts = [
    review.topGenre && { label: "Genre préféré", value: review.topGenre },
    review.topAuthor && {
      label: "Auteur le plus lu",
      value: `${review.topAuthor.name} (${review.topAuthor.count})`,
    },
    review.busiestMonth && {
      label: "Mois le plus lu",
      value: `${review.busiestMonth.name}, ${plural(review.busiestMonth.count, "livre")}`,
    },
    review.longestBook && {
      label: "Plus long voyage",
      value: `${review.longestBook.title}, ${review.longestBook.pageCount} p.`,
    },
  ].filter((fact): fact is { label: string; value: string } => !!fact);

  const goalReached = review.goal !== null && review.booksCount >= review.goal;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: theme.background,
        color: theme.ink,
        padding: "96px 88px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori ne rend que <img> */}
        <img src={getLogoMark()} width={56} height={56} alt="" />
        <div style={{ display: "flex", fontSize: 38, fontWeight: 600 }}>
          {env.NEXT_PUBLIC_APP_NAME}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 44, color: theme.muted }}>
            Mon année de lecture
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 220,
              fontWeight: 700,
              lineHeight: 1,
              color: theme.accent,
              marginTop: 8,
              letterSpacing: -8,
            }}
          >
            {year}
          </div>
        </div>

        <div style={{ display: "flex", gap: 64, marginTop: 72 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 700, lineHeight: 1 }}>
              {review.booksCount}
            </div>
            <div style={{ display: "flex", fontSize: 38, color: theme.muted, marginTop: 12 }}>
              {review.booksCount > 1 ? "livres lus" : "livre lu"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 700, lineHeight: 1 }}>
              {review.pagesCount.toLocaleString("fr-FR")}
            </div>
            <div style={{ display: "flex", fontSize: 38, color: theme.muted, marginTop: 12 }}>
              pages tournées
            </div>
          </div>
        </div>

        {review.goal !== null && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
            <div style={{ display: "flex", fontSize: 34, color: theme.muted }}>
              {goalReached
                ? `Objectif de ${review.goal} livres atteint`
                : `Objectif : ${review.booksCount} sur ${review.goal} livres`}
            </div>
            <div
              style={{
                display: "flex",
                height: 18,
                borderRadius: 9,
                marginTop: 18,
                background: theme.surface,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: `${Math.min(review.booksCount / review.goal, 1) * 100}%`,
                  borderRadius: 9,
                  background: theme.accent,
                }}
              />
            </div>
          </div>
        )}

        {review.favoriteBook && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 40,
              marginTop: 64,
              padding: 36,
              borderRadius: 32,
              background: theme.surface,
            }}
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element -- Satori ne rend que <img>
              <img
                src={cover}
                width={150}
                height={228}
                alt=""
                style={{ borderRadius: 12, objectFit: "cover" }}
              />
            ) : (
              // Même couverture générée que dans l'application : titre et auteur sur la
              // teinte propre au livre.
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  width: 150,
                  height: 228,
                  borderRadius: 12,
                  padding: "18px 14px 16px 22px",
                  background: coverToneFor(review.favoriteBook.title),
                  color: "#f8f3ea",
                  borderLeft: "3px solid rgba(255,255,255,0.15)",
                }}
              >
                <div style={{ display: "flex", fontSize: 21, fontWeight: 700, lineHeight: 1.15 }}>
                  {review.favoriteBook.title.length > 48
                    ? `${review.favoriteBook.title.slice(0, 45)}...`
                    : review.favoriteBook.title}
                </div>
                <div style={{ display: "flex", fontSize: 14, opacity: 0.75, lineHeight: 1.2 }}>
                  {review.favoriteBook.author}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", fontSize: 30, color: theme.muted }}>Coup de cœur</div>
              <div
                style={{
                  display: "flex",
                  fontSize: 46,
                  fontWeight: 700,
                  marginTop: 10,
                  lineHeight: 1.15,
                }}
              >
                {review.favoriteBook.title.length > 60
                  ? `${review.favoriteBook.title.slice(0, 57)}...`
                  : review.favoriteBook.title}
              </div>
              <div style={{ display: "flex", fontSize: 34, color: theme.muted, marginTop: 10 }}>
                {review.favoriteBook.author}
              </div>
              {review.favoriteBook.userRating !== null && (
                <div style={{ display: "flex", fontSize: 34, color: theme.accent, marginTop: 14 }}>
                  {`${formatRating(review.favoriteBook.userRating)}/5`}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 56 }}>
          {facts.slice(0, review.favoriteBook ? 3 : 4).map((fact) => (
            <div key={fact.label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, color: theme.muted }}>{fact.label}</div>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 600, marginTop: 4 }}>
                {fact.value.length > 44 ? `${fact.value.slice(0, 41)}...` : fact.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isPreview && theme.premium && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "18px 0",
            marginBottom: 32,
            borderRadius: 18,
            background: theme.accent,
            color: theme.background,
            fontSize: 34,
            fontWeight: 600,
          }}
        >
          Aperçu du style {theme.label}, avec Premium
        </div>
      )}

      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: theme.muted,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex" }}>Suivez vos lectures sur</div>
        <div style={{ display: "flex", color: theme.ink, fontWeight: 600 }}>{host}</div>
      </div>
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
});
