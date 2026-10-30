import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { getOptionalSession } from "@/lib/permissions";

/**
 * Châssis des écrans de l'application connectée : barre de navigation, contenu, pied de page.
 *
 * Vit dans les layouts et non dans les pages, pour deux raisons : le pied de page est un
 * Server Component (il lit `CONTACT_EMAIL`) et ne peut donc pas être rendu depuis une page
 * marquée `"use client"`, comme l'ajout de livre ou l'import CSV ; et le châssis était
 * jusqu'ici recopié à l'identique dans chaque page.
 *
 * Les pages gardent leur propre `<main>`, dont la largeur maximale varie de l'une à l'autre.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  // Lue côté serveur (et mise en cache pour la requête, le pied de page la relit) : la
  // navigation s'affiche dès le premier rendu, sans attendre la session côté client.
  const session = await getOptionalSession();

  return (
    // Marge basse sur mobile : la barre de navigation y est fixée en bas, au-dessus de la
    // zone de l'indicateur d'accueil, et recouvrirait autrement la fin du pied de page.
    // `min-h-dvh` et non `min-h-screen` : sur iOS, 100vh dépasse la hauteur visible et
    // laissait un grand vide sous le pied de page.
    <div className="flex min-h-dvh flex-col bg-stone-50 pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-0 sm:pl-60">
      <Navigation signedIn={session !== null} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
