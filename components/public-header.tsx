import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * En-tête des pages publiques (accueil, guides) : le logo vers l'accueil, les tarifs (une
 * section de l'accueil), et la connexion.
 */
export function PublicHeader() {
  return (
    <header className="glass sticky top-0 z-50 border-b border-stone-200/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="BookList, accueil">
          <Logo priority />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-stone-600">
          <Link href="/#tarifs" className="transition-colors duration-200 hover:text-stone-900">
            Tarifs
          </Link>
          <Link href="/login" className="transition-colors duration-200 hover:text-stone-900">
            Se connecter
          </Link>
        </nav>
      </div>
    </header>
  );
}
