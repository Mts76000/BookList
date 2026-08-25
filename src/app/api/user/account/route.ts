import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

const ANONYMIZED_EMAIL_DOMAIN = "anonymized.booklist"

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = rateLimit(`account-delete:${getClientIp(request)}:${session.user.id}`, {
      limit: 5,
      windowMs: 15 * 60_000,
    })
    if (!success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    if (user.isAnonymized) {
      return NextResponse.json({ error: "Compte déjà supprimé" }, { status: 400 })
    }

    const anonymizedEmail = `deleted-${user.id}@${ANONYMIZED_EMAIL_DOMAIN}`
    const randomPassword = await bcrypt.hash(crypto.randomUUID(), 12)

    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { userId: user.id } }),
      prisma.readingActivity.deleteMany({ where: { userId: user.id } }),
      prisma.book.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          email: anonymizedEmail,
          name: null,
          password: randomPassword,
          resetToken: null,
          resetTokenExpiry: null,
          hasSeenOnboarding: false,
          isAnonymized: true,
          anonymizedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json(
      { error: "Échec de la suppression du compte" },
      { status: 500 }
    )
  }
}
