import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, initialBooksRead } = body

    if (name !== undefined && name !== null && (typeof name !== "string" || name.length > 200)) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name || null
    if (initialBooksRead !== undefined) {
      const parsed = parseInt(initialBooksRead, 10)
      data.initialBooksRead = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100_000 ? parsed : 0
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data,
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
