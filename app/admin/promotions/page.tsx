import type { Metadata } from "next";
import { getStripe } from "@/lib/stripe";
import { listPromotionCodes } from "@/lib/admin-stripe";
import { AdminPageHeader, StripeNotConfigured } from "@/app/admin/admin-ui";
import { PromotionForm, PromotionToggle } from "@/app/admin/promotions/promotion-form";

export const metadata: Metadata = {
  title: "Codes promo",
  robots: { index: false, follow: false },
};

export default async function AdminPromotionsPage() {
  const header = (
    <AdminPageHeader
      title="Codes promo"
      subtitle="Saisis par le client sur la page de paiement Stripe. Un code utilisé ne peut pas être supprimé, seulement désactivé."
      breadcrumb={[{ href: "/admin", label: "Administration" }]}
    />
  );
  if (!getStripe()) {
    return (
      <>
        {header}
        <StripeNotConfigured />
      </>
    );
  }

  const codes = await listPromotionCodes();

  return (
    <>
      {header}
      <section className="card">
        <h2 className="border-b border-stone-100 px-5 pt-5 pb-3 text-base font-semibold text-stone-900 sm:px-6">
          Nouveau code
        </h2>
        <PromotionForm />
      </section>

      <section className="card mt-6 overflow-hidden">
        <h2 className="border-b border-stone-100 px-5 pt-5 pb-3 text-base font-semibold text-stone-900 sm:px-6">
          Codes existants
        </h2>
        {codes.length === 0 ? (
          <p className="p-5 text-sm text-stone-500">Aucun code pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {codes.map((code) => (
              <li
                key={code.id}
                className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${code.active ? "" : "opacity-60"}`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-stone-900">
                      {code.code}
                    </span>
                    <span
                      className={`badge ${code.active ? "bg-moss-100 text-moss-800" : "bg-stone-100 text-stone-500"}`}
                    >
                      {code.active ? "Actif" : "Inactif"}
                    </span>
                  </p>
                  <p className="text-sm text-stone-600">{code.discount}</p>
                  <p className="text-xs text-stone-400">
                    {code.timesRedeemed} utilisation{code.timesRedeemed > 1 ? "s" : ""}
                    {code.maxRedemptions ? ` sur ${code.maxRedemptions}` : ""}
                    {code.expiresAt && `, expire le ${code.expiresAt.toLocaleDateString("fr-FR")}`}
                    {code.firstTimeOnly && ", nouveaux abonnés"}
                  </p>
                </div>
                <PromotionToggle id={code.id} active={code.active} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
