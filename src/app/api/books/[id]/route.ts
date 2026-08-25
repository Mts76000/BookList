import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateBookInput } from "@/lib/validation"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

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

    const { success } = rateLimit(`books-update:${getClientIp(request)}:${session.user.id}`, {
      limit: 60,
      windowMs: 60_000,
    })
    if (!success) {
      return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
    }

    const body = await request.json()

    let fields
    try {
      fields = validateBookInput(body)
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : "Champs invalides" },
        { status: 400 }
      )
    }

    const book = await prisma.book.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 })
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: fields,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = rateLimit(`books-delete:${getClientIp(request)}:${session.user.id}`, {
      limit: 30,
      windowMs: 60_000,
    })
    if (!success) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429 }
      )
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
