import type { Metadata } from "next";
import { countDistinct, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscription } from "@/drizzle/schema";
import { isPushEnabled } from "@/lib/push";
import { AdminPageHeader, StatTile } from "@/app/admin/admin-ui";
import { NotificationForm } from "@/app/admin/notifications/notification-form";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function AdminNotificationsPage() {
  const [stats] = await db
    .select({ devices: count(), users: countDistinct(pushSubscription.userId) })
    .from(pushSubscription);

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        subtitle="Envoyez une notification push : pour tester sur vos appareils, ou pour écrire aux lecteurs."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <StatTile label="Lecteurs abonnés" value={stats.users} />
        <StatTile label="Appareils" value={stats.devices} />
      </div>

      {!isPushEnabled() && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Les clés VAPID ne sont pas configurées dans cet environnement : l&apos;envoi sera refusé.
          Renseignez <code className="font-mono text-xs">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> et{" "}
          <code className="font-mono text-xs">VAPID_PRIVATE_KEY</code>.
        </div>
      )}

      <section className="card p-5 sm:p-6">
        <NotificationForm subscriberCount={stats.users} />
        <p className="mt-6 border-t border-stone-100 pt-4 text-xs text-stone-500">
          Pour recevoir le test sur votre téléphone, activez d&apos;abord les rappels depuis Compte,
          Rappels et application, sur cet appareil. Sur iPhone, l&apos;application doit être
          installée sur l&apos;écran d&apos;accueil.
        </p>
      </section>
    </>
  );
}
