import Link from "next/link";
import { env } from "@/lib/env";

/** Generic legal footer, identical across every project built from this starter. */
export function Footer() {
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
        </nav>
      </div>
    </footer>
  );
}
