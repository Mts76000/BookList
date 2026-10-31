import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CaretRight, Crown, Database, ShieldCheck } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { requireAuthPage } from "@/lib/permissions";
import { countUserQuotes, getUserPlan } from "@/lib/subscription";
import { FREE_BOOK_LIMIT, FREE_QUOTE_LIMIT } from "@/lib/plans";
import { BuyMeACoffeeButton } from "@/components/buy-me-a-coffee";
import { ProfileForm, SectionCard, SignOutButton } from "@/app/account/account-sections";
import { UsageMeter } from "@/app/account/account-ui";

// Page privée et personnalisée : rien à y indexer.
export const metadata: Metadata = {
  title: "Compte",
  robots: { index: false, follow: false },
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2);
  return (initials ?? "?").toUpperCase();
}

const SECTIONS: { href: string; icon: Icon; title: string; description: string }[] = [
  {
    href: "/account/premium",
    icon: Crown,
    title: "Premium",
    description: "Votre formule, l'abonnement et les factures",
  },
  {
    href: "/account/notifications",
    icon: Bell,
    title: "Rappels et application",
    description: "Notifications de lecture, installation sur l'écran d'accueil",
  },
  {
    href: "/account/securite",
    icon: ShieldCheck,
    title: "Sécurité",
    description: "Mot de passe et appareils connectés",
  },
  {
    href: "/account/donnees",
    icon: Database,
    title: "Données et suppression",
    description: "Export de votre bibliothèque, suppression du compte",
  },
];

/**
 * Vue d'ensemble du compte : l'identité, la formule en un coup d'œil, le profil de lecture,
 * puis les réglages, rangés dans des sous-pages pour que rien ne se noie dans une longue
 * liste. Vérification d'accès autoritaire ici (`proxy.ts` n'est qu'optimiste), comme sur
 * chaque sous-page.
 */
export default async function AccountPage() {
  const session = await requireAuthPage("/account");
  const user = session.user;
  const [plan, quoteCount] = await Promise.all([getUserPlan(user.id), countUserQuotes(user.id)]);
  const memberSince = new Date(user.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="bg-primary text-on-primary flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] font-serif text-xl">
            {initialsFrom(user.name || user.email)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-2xl text-stone-900">
              {user.name || "Mon compte"}
            </h1>
            <p className="truncate text-sm text-stone-500">{user.email}</p>
            <p className="text-xs text-stone-400">Membre depuis {memberSince}</p>
          </div>
        </div>
        <SignOutButton />
      </header>

      {plan.isPremium ? (
        <Link
          href="/account/premium"
          className="card card-interactive flex items-center justify-between gap-4 p-5"
        >
          <div className="flex items-center gap-3">
            <span className="bg-accent-50 text-accent-700 flex size-10 items-center justify-center rounded-full">
              <Crown size={20} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <p className="font-medium text-stone-900">
                {plan.isTrial ? "Essai Premium en cours" : "BookList Premium"}
              </p>
              <p className="text-sm text-stone-500">Livres et citations sans limite.</p>
            </div>
          </div>
          <CaretRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
        </Link>
      ) : (
        <section className="card overflow-hidden">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-stone-900">Formule gratuite</h2>
              <Link
                href="/account/premium"
                className="text-accent-700 text-sm font-medium hover:underline"
              >
                Voir Premium
              </Link>
            </div>
            <UsageMeter label="Livres" used={plan.bookCount} limit={FREE_BOOK_LIMIT} />
            <UsageMeter label="Citations" used={quoteCount} limit={FREE_QUOTE_LIMIT} />
          </div>
        </section>
      )}

      <SectionCard
        title="Profil de lecture"
        description="Votre prénom, pour vous saluer, et les livres lus avant votre inscription."
      >
        <ProfileForm userName={user.name} initialBooksRead={user.initialBooksRead} />
      </SectionCard>

      <nav aria-label="Réglages du compte" className="card divide-y divide-stone-100">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center gap-4 px-5 py-4 transition first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-stone-50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-stone-100 text-stone-700">
              <section.icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-stone-900">{section.title}</span>
              <span className="block truncate text-sm text-stone-500">{section.description}</span>
            </span>
            <CaretRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <BuyMeACoffeeButton />
    </div>
  );
}
