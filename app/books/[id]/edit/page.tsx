import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { db } from "@/lib/db";
import { book } from "@/drizzle/schema";
import { requireAuthPage } from "@/lib/permissions";
import { getKnownSeries } from "@/lib/series-store";
import { BookEditForm } from "@/components/book-edit-form";

export default async function BookEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthPage();
  const { id } = await params;

  const [entry, knownSeries] = await Promise.all([
    // Même règle que la fiche : le livre d'un autre utilisateur est introuvable.
    db.query.book.findFirst({ where: and(eq(book.id, id), eq(book.userId, session.user.id)) }),
    getKnownSeries(session.user.id),
  ]);
  if (!entry) notFound();

  return (
    <main
      id="main-content"
      className="animate-fade-in-up mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <Link
        href={`/books/${entry.id}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-stone-500 transition hover:text-stone-900"
      >
        <CaretLeft className="h-4 w-4" aria-hidden="true" />
        Retour à la fiche
      </Link>
      <header className="mt-2 mb-6">
        <h1 className="font-serif text-2xl text-stone-900 sm:text-3xl">Modifier le livre</h1>
        <p className="mt-1 truncate text-sm text-stone-500">
          {entry.title}, {entry.author}
        </p>
      </header>
      <BookEditForm book={entry} knownSeries={knownSeries} />
    </main>
  );
}
