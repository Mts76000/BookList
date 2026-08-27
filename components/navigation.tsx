"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/books", label: "Livres", icon: BooksIcon },
  { href: "/books/add", label: "Ajouter", icon: AddIcon },
  { href: "/account", label: "Compte", icon: UserIcon },
];

export function Navigation() {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session) return null;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    // La fiche d'un livre garde l'onglet « Livres » actif, mais pas l'écran d'ajout,
    // qui a son propre onglet.
    if (href === "/books") {
      return pathname === "/books" || (pathname.startsWith("/books/") && pathname !== "/books/add");
    }
    return pathname === href;
  };

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="glass sticky top-0 z-40 border-b border-stone-200/70 sm:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="font-serif text-lg font-medium tracking-tight text-stone-900"
          >
            BookList
          </Link>
        </div>
      </header>

      <nav
        aria-label="Navigation principale"
        className="bg-card fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/70 sm:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors duration-200 ${
                  active ? "text-accent-600" : "text-stone-400"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${active ? "-translate-y-0.5" : ""}`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav
        aria-label="Navigation principale"
        className="bg-background-soft fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-stone-200/70 sm:flex"
      >
        <Link
          href="/dashboard"
          className="flex h-16 items-center px-6 font-serif text-lg font-medium tracking-tight text-stone-900"
        >
          BookList
        </Link>

        <div className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  active ? "text-stone-900" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {active && (
                  <>
                    <span className="bg-card absolute inset-0 rounded-[var(--radius-sm)] shadow-[0_1px_2px_rgba(36,29,21,0.04),0_6px_16px_-8px_rgba(36,29,21,0.25)]" />
                    <span className="bg-accent-500 absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full" />
                  </>
                )}
                <Icon className="relative h-5 w-5 shrink-0" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-stone-200/70 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-destructive/70 hover:bg-destructive/5 hover:text-destructive flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors duration-200"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            Déconnexion
          </button>
        </div>
      </nav>
    </>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function BooksIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function AddIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l-3-3m0 0l3-3m-3 3H15"
      />
    </svg>
  );
}
