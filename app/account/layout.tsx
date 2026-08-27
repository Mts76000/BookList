import { Navigation } from "@/components/navigation";

// Même châssis que le reste de l'application connectée (tableau de bord, bibliothèque) :
// la barre latérale plutôt que l'en-tête public du socle, pour ne pas donner l'impression
// de quitter l'application en allant sur son compte.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main
        id="main-content"
        className="animate-fade-in-up mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}
