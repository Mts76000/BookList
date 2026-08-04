"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Accueil", icon: HomeIcon },
  { href: "/books", label: "Livres", icon: BooksIcon },
  { href: "/books/add", label: "Ajouter", icon: AddIcon },
  { href: "/profile", label: "Profil", icon: UserIcon },
]

export function Navigation() {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (!session) return null

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    if (href === "/books") return pathname === "/books" || pathname.startsWith("/books/") && pathname !== "/books/add"
    return pathname === href
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-stone-900">
            BookList
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="hidden text-sm font-medium text-stone-500 transition hover:text-stone-900 sm:block"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-white/95 backdrop-blur-md sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                  active ? "text-stone-900" : "text-stone-400"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-stone-900" : "text-stone-400"}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <nav className="hidden sm:block">
        <div className="mx-auto max-w-5xl px-6 pb-2">
          <div className="flex gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function BooksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function AddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}
