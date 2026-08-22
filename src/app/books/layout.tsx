import type { Metadata } from "next"

// Un layout (Server Component) plutôt qu'un export par page : certaines pages
// de ce segment (add, import) sont des Client Components qui ne peuvent pas
// exporter `metadata` elles-mêmes. Tout /books/* est privé, donc non indexé.
export const metadata: Metadata = {
  title: "Livres",
  robots: { index: false, follow: false },
}

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return children
}
