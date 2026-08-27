"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/audit", label: "Journal d'audit" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation de l'administration" className="flex gap-1">
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
            className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors ${
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
