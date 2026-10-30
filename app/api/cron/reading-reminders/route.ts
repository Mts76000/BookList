import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscription, readingActivity, user } from "@/drizzle/schema";
import { env } from "@/lib/env";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push";
import { readingStreaks } from "@/lib/advanced-stats";
import { PREMIUM_STREAK_JOKERS, isPremiumActive } from "@/lib/plans";

/**
 * Tâche planifiée : rappelle de lire aux utilisateurs abonnés aux notifications qui n'ont
 * encore rien enregistré aujourd'hui. À déclencher une fois par soir (vers 20 h) depuis les
 * Scheduled Tasks de Coolify, comme `/api/cron/cleanup-expired-tokens` :
 *   POST /api/cron/reading-reminders
 *   Authorization: Bearer <CRON_SECRET>
 */
export const POST = withApiErrorHandling(async (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return apiError("UNAUTHORIZED", "Invalid or missing cron secret.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const recipients = await db
    .selectDistinct({
      id: user.id,
      premiumUntil: user.premiumUntil,
      grantedUntil: user.premiumGrantedUntil,
    })
    .from(pushSubscription)
    .innerJoin(user, eq(user.id, pushSubscription.userId));

  let sent = 0;
  for (const recipient of recipients) {
    const activities = await db
      .select({ date: readingActivity.date, pagesRead: readingActivity.pagesRead })
      .from(readingActivity)
      .where(and(eq(readingActivity.userId, recipient.id), gt(readingActivity.pagesRead, 0)));
    if (activities.some((activity) => activity.date === today)) continue;

    const { current } = readingStreaks(
      activities,
      new Date(),
      isPremiumActive(recipient.premiumUntil) || isPremiumActive(recipient.grantedUntil)
        ? PREMIUM_STREAK_JOKERS
        : 0,
    );
    sent += await sendPushToUser(recipient.id, {
      title: current > 0 ? `Votre série de ${current} jours vous attend` : "Un chapitre ce soir ?",
      body:
        current > 0
          ? "Notez quelques pages lues aujourd'hui pour la prolonger."
          : "Quelques pages suffisent pour lancer une nouvelle série de lecture.",
      url: "/dashboard",
    });
  }

  logger.info({ recipients: recipients.length, sent }, "Sent reading reminders");
  return apiSuccess({ recipients: recipients.length, sent });
});
