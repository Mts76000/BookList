import Link from "next/link";

const TABS = [
  { href: "/dashboard/stats", label: "Statistiques" },
  { href: "/dashboard/stats/bilan", label: "Bilan annuel" },
  { href: "/dashboard/stats/defis", label: "Défis" },
] as const;

/**
 * Onglets de la section Stats. Le bilan annuel en fait partie : il doit être atteignable
 * depuis le menu, pas seulement depuis un lien ailleurs dans l'application.
 */
export function StatsTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav
      aria-label="Sections des statistiques"
      className="mb-8 flex gap-6 border-b border-stone-200"
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
