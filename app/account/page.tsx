import type { Metadata } from "next";
import { requireAuthPage } from "@/lib/permissions";
import { getReadingStats } from "@/lib/reading-stats";
import { AccountView } from "@/app/account/account-view";

// Page privée et personnalisée : rien à y indexer.
export const metadata: Metadata = {
  title: "Compte",
  robots: { index: false, follow: false },
};

/**
 * Vérification d'accès autoritaire de cette page : `proxy.ts` ne fait qu'un contrôle
 * optimiste de présence du cookie. Une session révoquée côté serveur est rejetée ici dès la
 * navigation suivante, même si l'état client n'est pas encore à jour.
 */
export default async function AccountPage() {
  const session = await requireAuthPage("/account");
  const stats = await getReadingStats(session.user.id, session.user.initialBooksRead);

  return (
    <AccountView
      stats={stats}
      userName={session.user.name}
      userEmail={session.user.email}
      initialBooksRead={session.user.initialBooksRead}
      memberSince={new Date(session.user.createdAt).toLocaleDateString("fr-FR")}
    />
  );
}
