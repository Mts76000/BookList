import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { book, quote } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getUserPlan } from "@/lib/subscription";
import { BooksTabs } from "@/components/books-tabs";
import { QuoteActions } from "@/components/book-quotes";
import { PremiumTeaser } from "@/components/premium-teaser";

/** Échappe les jokers de LIKE pour chercher le texte tel que saisi. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuthPage("/books/citations");
  const [{ q }, plan] = await Promise.all([searchParams, getUserPlan(session.user.id)]);
  // La recherche est un avantage Premium : ignorée pour un compte gratuit.
  const search = plan.isPremium ? (q ?? "").trim().slice(0, 200) : "";
  const pattern = `%${escapeLike(search)}%`;

  const quotes = await db
    .select({
      id: quote.id,
      content: quote.content,
      page: quote.page,
      bookId: book.id,
      title: book.title,
      author: book.author,
    })
    .from(quote)
    .innerJoin(book, eq(book.id, quote.bookId))
    .where(
      and(
        eq(quote.userId, session.user.id),
        search
          ? or(
              ilike(quote.content, pattern),
              ilike(book.title, pattern),
              ilike(book.author, pattern),
            )
          : undefined,
      ),
    )
    .orderBy(desc(quote.createdAt));

  return (
    <main
      id="main-content"
      className="animate-fade-in-up mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <BooksTabs active="/books/citations" />

      <header className="mb-6">
        <h1 className="font-serif text-2xl text-stone-900 sm:text-3xl">Vos citations</h1>
        <p className="mt-1 text-sm text-stone-500">Ajoutez-en depuis la fiche de chaque livre.</p>
      </header>

      {plan.isPremium ? (
        <form role="search" className="mb-6 sm:max-w-md">
          <label htmlFor="quote-search" className="sr-only">
            Rechercher dans vos citations
          </label>
          <div className="relative">
            <MagnifyingGlass
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              id="quote-search"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Un mot, un titre, un auteur"
              className="border-border bg-card focus:border-accent-400 focus:ring-accent-400/15 w-full rounded-[var(--radius-sm)] border py-3 pr-4 pl-11 text-base placeholder:text-stone-400 focus:ring-4 focus:outline-none"
            />
          </div>
        </form>
      ) : (
        <PremiumTeaser
          className="mb-6"
          trialAvailable={plan.trialAvailable}
          title="Retrouvez n'importe quelle citation"
          description="Avec Premium : recherche par mot, titre ou auteur, citations illimitées et images à partager."
        />
      )}

      {quotes.length === 0 ? (
        <p className="card p-6 text-center text-sm text-stone-500">
          {search
            ? `Aucune citation ne correspond à « ${search} ».`
            : "Aucune citation pour l'instant. Ouvrez un livre pour noter un passage qui vous a marqué."}
        </p>
      ) : (
        <ul className="gap-4 md:columns-2">
          {quotes.map((entry) => (
            <li key={entry.id} className="card mb-4 flex break-inside-avoid gap-3 p-5">
              <div className="border-accent-300 min-w-0 flex-1 border-l-2 pl-4">
                <p className="font-serif whitespace-pre-line text-stone-800">{entry.content}</p>
                <p className="mt-2 text-xs text-stone-500">
                  <Link href={`/books/${entry.bookId}`} className="font-medium hover:underline">
                    {entry.title}
                  </Link>
                  , {entry.author}
                  {entry.page !== null && `, page ${entry.page}`}
                </p>
              </div>
              <QuoteActions quote={entry} bookTitle={entry.title} isPremium={plan.isPremium} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
