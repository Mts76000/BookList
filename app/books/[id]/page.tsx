import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, comment } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { Navigation } from "@/components/navigation";
import { BookDetails } from "@/components/book-details";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
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

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main
        id="main-content"
        className="animate-fade-in-up mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <BookDetails book={entry} />
      </main>
    </div>
  );
}
