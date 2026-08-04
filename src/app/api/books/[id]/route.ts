import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      userRating,
      title,
      author,
      description,
      coverUrl,
      pageCount,
      genre,
      publishedDate,
      userReadDate,
    } = body

    const book = await prisma.book.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    // On ne met à jour que les champs explicitement fournis dans la requête
    const data: Record<string, unknown> = {}
    if (userRating !== undefined) data.userRating = userRating
    if (title !== undefined) data.title = title
    if (author !== undefined) data.author = author
    if (description !== undefined) data.description = description || null
    if (coverUrl !== undefined) data.coverUrl = coverUrl || null
    if (pageCount !== undefined) data.pageCount = pageCount || null
    if (genre !== undefined) data.genre = genre || null
    if (publishedDate !== undefined) data.publishedDate = publishedDate || null
    if (userReadDate !== undefined) data.userReadDate = userReadDate ? new Date(userReadDate) : null

    const updatedBook = await prisma.book.update({
      where: { id },
      data,
    })

    return NextResponse.json({ book: updatedBook })
  } catch (error) {
    console.error("Book update error:", error)
    return NextResponse.json(
      { error: "Failed to update book" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const book = await prisma.book.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    await prisma.book.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Book deletion error:", error)
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 }
    )
  }
}
