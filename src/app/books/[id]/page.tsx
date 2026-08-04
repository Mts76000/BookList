import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { BookDetails } from "@/components/BookDetails"

async function getBook(id: string, userId: string) {
  return prisma.book.findFirst({
    where: { id, userId },
    include: {
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  })
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const { id } = await params
  const book = await getBook(id, session.user.id)

  if (!book) {
    redirect("/books")
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8 sm:pl-60">
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <BookDetails book={book} />
      </main>
    </div>
  )
}
