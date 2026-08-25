import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = rateLimit(`comments:${getClientIp(request)}:${session.user.id}`, {
      limit: 60,
      windowMs: 60_000,
    })
    if (!success) {
      return NextResponse.json(
        { error: "Trop de commentaires. Réessayez dans une minute." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { content } = body

    const trimmed = typeof content === "string" ? content.trim() : ""
    if (!trimmed || trimmed.length > 5000) {
      return NextResponse.json(
        { error: "Le commentaire doit faire entre 1 et 5000 caractères" },
        { status: 400 }
      )
    }

    const book = await prisma.book.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: trimmed,
        bookId: id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error("Comment creation error:", error)
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    )
  }
}
