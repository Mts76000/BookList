import Link from "next/link";

const TABS = [
  { href: "/books", label: "Étagère" },
  { href: "/books/sagas", label: "Sagas" },
  { href: "/books/citations", label: "Citations" },
] as const;

/** Onglets de la section Livres. */
export function BooksTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav
      aria-label="Sections de la bibliothèque"
      className="mb-6 flex gap-6 border-b border-stone-200"
    >
      {TABS.map((tab) => {
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-accent-500 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
