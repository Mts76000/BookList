import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navigation } from "@/components/Navigation"
import { ProfileView } from "@/components/ProfileView"

async function getProfileData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, initialBooksRead: true, createdAt: true },
  })

  const totalBooks = await prisma.book.count({ where: { userId } })

  const totalPagesRead = await prisma.book.aggregate({
    where: { userId, pageCount: { not: null } },
    _sum: { pageCount: true },
  })

  const averageRating = await prisma.book.aggregate({
    where: { userId, userRating: { not: null } },
    _avg: { userRating: true },
  })

  const commentsCount = await prisma.comment.count({ where: { userId } })

  return {
    user,
    totalBooks: totalBooks + (user?.initialBooksRead || 0),
    totalPagesRead: totalPagesRead._sum.pageCount || 0,
    averageRating: averageRating._avg.userRating || 0,
    commentsCount,
  }
}

export default async function Profile() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const data = await getProfileData(session.user.id)

  return (
    <div className="min-h-screen bg-stone-50 pb-24 sm:pb-8">
      <Navigation />
      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900">Profil</h1>
        <ProfileView
          name={data.user?.name || null}
          email={data.user?.email || session.user.email || ""}
          memberSince={data.user?.createdAt || null}
          initialBooksRead={data.user?.initialBooksRead || 0}
          totalBooks={data.totalBooks}
          totalPagesRead={data.totalPagesRead}
          averageRating={data.averageRating}
          commentsCount={data.commentsCount}
        />
      </main>
    </div>
  )
}
