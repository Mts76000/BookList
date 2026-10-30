import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscription } from "@/drizzle/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let configured = false;

export function isPushEnabled(): boolean {
  return !!(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

function configure(): boolean {
  if (!isPushEnabled()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      `mailto:${env.CONTACT_EMAIL}`,
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
    );
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Page ouverte au clic sur la notification. */
  url: string;
}

/**
 * Envoie une notification à tous les appareils d'un utilisateur. Un abonnement que le
 * service de push déclare disparu (404/410 : appli désinstallée, permission retirée) est
 * supprimé, pour ne pas le retenter chaque soir. Ne lève jamais : un rappel manqué n'est
 * pas une erreur.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;

  const subscriptions = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId));

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
        { TTL: 6 * 60 * 60 },
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscription).where(eq(pushSubscription.id, subscription.id));
      } else {
        logger.warn({ err, userId }, "Push notification failed");
      }
    }
  }
  return sent;
}
