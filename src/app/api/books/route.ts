import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      author,
      isbn,
      description,
      coverUrl,
      pageCount,
      genre,
      publishedDate,
      userRating,
      userReadDate,
    } = body

    if (!title || !author) {
      return NextResponse.json(
        { error: "Title and author are required" },
        { status: 400 }
      )
    }

    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn: isbn || null,
        description: description || null,
        coverUrl: coverUrl || null,
        pageCount: pageCount || null,
        genre: genre || null,
        publishedDate: publishedDate || null,
        userRating: userRating || null,
        userReadDate: userReadDate ? new Date(userReadDate) : null,
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
