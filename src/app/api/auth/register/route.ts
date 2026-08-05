import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`register:${ip}`, { limit: 5, windowMs: 15 * 60_000 })
  if (!success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email, password, name, initialBooksRead } = body

    if (
      !email ||
      typeof email !== "string" ||
      !EMAIL_REGEX.test(email) ||
      !password ||
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 128
    ) {
      return NextResponse.json(
        { error: "Email ou mot de passe invalide" },
        { status: 400 }
      )
    }

    if (name !== undefined && name !== null && typeof name !== "string") {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 })
    }

    const parsedInitialBooksRead = Number(initialBooksRead)
    const safeInitialBooksRead =
      Number.isFinite(parsedInitialBooksRead) && parsedInitialBooksRead >= 0
        ? Math.floor(parsedInitialBooksRead)
        : 0

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        initialBooksRead: safeInitialBooksRead,
      }
    })

    return NextResponse.json(
      { 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
