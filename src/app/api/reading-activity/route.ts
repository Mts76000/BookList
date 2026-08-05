import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { pagesRead, date } = body

    if (!pagesRead || pagesRead < 0) {
      return NextResponse.json(
        { error: "Invalid pages read value" },
        { status: 400 }
      )
    }

    const activityDate = date ? new Date(date) : new Date()
    activityDate.setHours(0, 0, 0, 0)

    const activity = await prisma.readingActivity.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: activityDate,
        },
      },
      update: {
        pagesRead: pagesRead,
      },
      create: {
        userId: session.user.id,
        date: activityDate,
        pagesRead,
      },
    })

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error("Reading activity error:", error)
    return NextResponse.json(
      { error: "Failed to record reading activity" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Prisma.ReadingActivityWhereInput = { userId: session.user.id }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const activities = await prisma.readingActivity.findMany({
      where,
      orderBy: { date: "desc" },
    })

    return NextResponse.json({ activities })
  } catch (error) {
    console.error("Reading activities fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch reading activities" },
      { status: 500 }
    )
  }
}
