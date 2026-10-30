import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

// La page d'inscription est un Client Component : ses métadonnées passent par ce layout.
export const metadata: Metadata = {
  title: "Créer un compte gratuit",
  description:
    "Créez votre compte BookList gratuitement et commencez à suivre vos lectures : bibliothèque, carnet de lecture, objectifs et statistiques.",
  alternates: { canonical: canonicalUrl("/register") },
  robots: { index: true, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
