import type { Metadata } from "next";
import { requireAuthPage } from "@/lib/permissions";
import { DataExport, DeleteAccount, SectionCard } from "@/app/account/account-sections";
import { AccountSubpageHeader } from "@/app/account/account-ui";

export const metadata: Metadata = {
  title: "Données et suppression",
  robots: { index: false, follow: false },
};

export default async function DataPage() {
  await requireAuthPage("/account/donnees");

  return (
    <div>
      <AccountSubpageHeader title="Données et suppression" />
      <div className="flex flex-col gap-6">
        <SectionCard
          title="Exporter vos données"
          description="Gratuit et à tout moment. Le fichier CSV se réimporte tel quel dans BookList."
        >
          <DataExport />
        </SectionCard>
        <SectionCard
          tone="danger"
          title="Supprimer le compte"
          description="Vos livres, notes et citations sont effacés définitivement, et un abonnement en cours est résilié."
        >
          <DeleteAccount />
        </SectionCard>
      </div>
    </div>
  );
}
