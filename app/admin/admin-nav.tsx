"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/subscriptions", label: "Abonnements" },
  { href: "/admin/payments", label: "Paiements" },
  { href: "/admin/promotions", label: "Codes promo" },
  { href: "/admin/audit", label: "Journal d'audit" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation de l'administration"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {LINKS.map((link) => {
        // « Vue d'ensemble » n'est actif que sur /admin exactement, sinon il le resterait
        // sur toutes les sous-pages.
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              active ? "bg-stone-900 text-stone-50" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
