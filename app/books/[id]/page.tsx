import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, comment, quote } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { BookDetails } from "@/components/book-details";
import { BookQuotes } from "@/components/book-quotes";
import { SeriesNav } from "@/components/series-nav";
import { getUserPlan } from "@/lib/subscription";
import { getKnownSeries } from "@/lib/series-store";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthPage();
  const { id } = await params;

  const entry = await db.query.book.findFirst({
    // La condition porte sur (id, userId) : le livre d'un autre utilisateur est introuvable,
    // et non interdit — on ne révèle pas son existence.
    where: and(eq(book.id, id), eq(book.userId, session.user.id)),
    with: {
      comments: {
        orderBy: [desc(comment.createdAt)],
      },
    },
  });

  if (!entry) notFound();

  const [quotes, plan, seriesVolumes, knownSeries] = await Promise.all([
    db
      .select({ id: quote.id, content: quote.content, page: quote.page })
      .from(quote)
      .where(eq(quote.bookId, entry.id))
      .orderBy(asc(quote.page), asc(quote.createdAt)),
    getUserPlan(session.user.id),
    entry.seriesName
      ? db
          .select({ id: book.id, title: book.title, seriesIndex: book.seriesIndex })
          .from(book)
          .where(
            and(
              eq(book.userId, session.user.id),
              sql`lower(${book.seriesName}) = lower(${entry.seriesName})`,
            ),
          )
      : Promise.resolve([]),
    getKnownSeries(session.user.id),
  ]);

  return (
    <>
      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <BookDetails book={entry} knownSeries={knownSeries} />
        {entry.seriesName && (
          <SeriesNav seriesName={entry.seriesName} current={entry} volumes={seriesVolumes} />
        )}
        <BookQuotes
          bookId={entry.id}
          bookTitle={entry.title}
          quotes={quotes}
          isPremium={plan.isPremium}
        />
      </main>
    </>
  );
}
