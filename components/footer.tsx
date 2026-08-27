import Link from "next/link";
import { env } from "@/lib/env";
import { getOptionalSession } from "@/lib/permissions";

/**
 * Pied de page légal, commun à toutes les pages. Il expose en plus un raccourci vers
 * l'administration, visible des seuls administrateurs : sans lui, /admin n'est atteignable
 * qu'en tapant l'adresse à la main, puisque la navigation ne le mentionne nulle part.
 */
export async function Footer() {
  const session = await getOptionalSession();
  const isAdmin = session?.user.role === "admin";

  return (
    <footer className="border-border border-t px-6 py-6">
      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 text-xs sm:flex-row">
        <p>
          © {new Date().getFullYear()} {env.NEXT_PUBLIC_APP_NAME}. Tous droits réservés.
        </p>
        <nav className="flex gap-4">
          <a href={`mailto:${env.CONTACT_EMAIL}`} className="hover:text-foreground">
            Contact
          </a>
          <Link href="/legal/notice" className="hover:text-foreground">
            Mentions légales
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            CGU
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            Confidentialité
          </Link>
          <Link href="/legal/cookies" className="hover:text-foreground">
            Cookies
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-accent-600 hover:text-accent-700 font-medium">
              Administration
            </Link>
          )}
        </nav>
      </div>
    </footer>
  );
}
