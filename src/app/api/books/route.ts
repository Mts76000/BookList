import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateBookInput } from "@/lib/validation"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = rateLimit(`books-create:${getClientIp(request)}:${session.user.id}`, {
      limit: 30,
      windowMs: 60_000,
    })
    if (!success) {
      return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
    }

    const body = await request.json()

    let fields
    try {
      fields = validateBookInput(body, { requireTitleAuthor: true })
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : "Champs invalides" },
        { status: 400 }
      )
    }

    const book = await prisma.book.create({
      data: {
        title: fields.title!,
        author: fields.author!,
        isbn: fields.isbn ?? null,
        description: fields.description ?? null,
        coverUrl: fields.coverUrl ?? null,
        pageCount: fields.pageCount ?? null,
        genre: fields.genre ?? null,
        publishedDate: fields.publishedDate ?? null,
        userRating: fields.userRating ?? null,
        userStartDate: fields.userStartDate ?? null,
        userEndDate: fields.userEndDate ?? null,
        status: fields.status ?? "FINISHED",
        userId: session.user.id,
      },
    })

    return NextResponse.json({ book }, { status: 201 })
  } catch (error) {
    console.error("Book creation error:", error)
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    )
  }
}
