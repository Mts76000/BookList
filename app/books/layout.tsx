import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

// Un layout plutôt qu'un export par page : certaines pages de ce segment (ajout, import)
// sont des Client Components, qui ne peuvent pas exporter `metadata` eux-mêmes.
// Tout /books/* est privé, donc non indexé.
export const metadata: Metadata = {
  title: "Livres",
  robots: { index: false, follow: false },
};

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
