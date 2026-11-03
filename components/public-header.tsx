import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * En-tête des pages publiques (accueil, guides) : le logo vers l'accueil, la connexion en
 * lien texte et l'inscription en bouton plein. Sur mobile, les tarifs cèdent leur place à
 * l'inscription : faute de bouton visible, les visiteurs tapaient « Se connecter » ou
 * « Tarifs » en espérant créer un compte.
 */
export function PublicHeader() {
  return (
    <header className="glass sticky top-0 z-50 border-b border-stone-200/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" aria-label="BookList, accueil">
          <Logo priority />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-stone-600 sm:gap-5">
          <Link
            href="/#tarifs"
            className="hidden transition-colors duration-200 hover:text-stone-900 sm:inline"
          >
            Tarifs
          </Link>
          <Link href="/login" className="transition-colors duration-200 hover:text-stone-900">
            Se connecter
          </Link>
          <Link
            href="/register"
            className="bg-primary text-on-primary hover:bg-accent-600 focus-visible:outline-ring rounded-[var(--radius-sm)] px-3.5 py-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            S&apos;inscrire
          </Link>
        </nav>
      </div>
    </header>
  );
}
