import type { Metadata } from "next";
import { requireAuthPage } from "@/lib/permissions";
import { PwaInstallSection } from "@/components/pwa-install";
import { ReminderSettings } from "@/components/reminder-settings";
import { SectionCard } from "@/app/account/account-sections";
import { AccountSubpageHeader } from "@/app/account/account-ui";

export const metadata: Metadata = {
  title: "Rappels et application",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  await requireAuthPage("/account/notifications");

  return (
    <div>
      <AccountSubpageHeader title="Rappels et application" />
      <div className="flex flex-col gap-6">
        <SectionCard
          title="Rappels de lecture"
          description="Une notification le soir quand votre journée de lecture n'est pas encore faite."
        >
          <ReminderSettings />
        </SectionCard>
        <SectionCard
          title="Installer l'application"
          description="Ajoutez BookList à votre écran d'accueil pour l'ouvrir comme une app."
        >
          <PwaInstallSection />
        </SectionCard>
      </div>
    </div>
  );
}
