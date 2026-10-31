"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRinging,
  ChartLineUp,
  Crown,
  CreditCard,
  ListMagnifyingGlass,
  Tag,
  Users,
} from "@phosphor-icons/react";

const LINKS = [
  { href: "/admin", label: "Vue d'ensemble", icon: ChartLineUp },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/subscriptions", label: "Abonnements", icon: Crown },
  { href: "/admin/payments", label: "Paiements", icon: CreditCard },
  { href: "/admin/promotions", label: "Codes promo", icon: Tag },
  { href: "/admin/notifications", label: "Notifications", icon: BellRinging },
  { href: "/admin/audit", label: "Journal d'audit", icon: ListMagnifyingGlass },
];

/**
 * Navigation de l'administration : verticale dans la barre latérale sur grand écran,
 * en bande défilante sous l'en-tête sur mobile.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation de l'administration"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-3 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
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
            className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-stone-800 font-medium text-stone-50"
                : "text-stone-400 hover:bg-stone-800/60 hover:text-stone-100"
            }`}
          >
            <link.icon size={16} weight={active ? "fill" : "regular"} aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
