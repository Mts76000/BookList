import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

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
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    // pb-24 sur mobile : la barre de navigation y est fixée en bas et recouvrirait
    // autrement la fin du pied de page.
    <div className="flex min-h-screen flex-col bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
