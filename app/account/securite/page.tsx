import type { Metadata } from "next";
import { requireAuthPage } from "@/lib/permissions";
import { PasswordForm, SectionCard, SessionList } from "@/app/account/account-sections";
import { AccountSubpageHeader } from "@/app/account/account-ui";

export const metadata: Metadata = {
  title: "Sécurité",
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  await requireAuthPage("/account/securite");

  return (
    <div>
      <AccountSubpageHeader title="Sécurité" />
      <div className="flex flex-col gap-6">
        <SectionCard title="Mot de passe" description="Le changer déconnecte vos autres appareils.">
          <PasswordForm />
        </SectionCard>
        <SectionCard
          title="Appareils connectés"
          description="Déconnectez un appareil que vous ne reconnaissez pas."
        >
          <SessionList />
        </SectionCard>
      </div>
    </div>
  );
}
