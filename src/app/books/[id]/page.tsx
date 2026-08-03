import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { BookDetails } from "@/components/BookDetails"

async function getBook(id: string, userId: string) {
  const book = await prisma.book.findFirst({
    where: { id, userId },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  return book
}

export default async function BookDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const book = await getBook(params.id, session.user.id)

  if (!book) {
    redirect("/books")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BookDetails book={book} userId={session.user.id} />
      </main>
    </div>
  )
}
