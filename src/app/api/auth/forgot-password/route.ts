import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@booklist.app"
const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { success } = rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 15 * 60_000 })
  if (!success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429 }
    )
  }

  try {
    const { email } = await request.json()
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 })
    }

    // Nettoyage opportuniste des tokens expirés
    await prisma.user.updateMany({
      where: { resetTokenExpiry: { lt: new Date() } },
      data: { resetToken: null, resetTokenExpiry: null },
    })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // On renvoie quand même un succès pour ne pas divulguer l'existence du compte
      return NextResponse.json({ success: true })
    }

    const token = randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 1000 * 60 * 60) // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    })

    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Réinitialisation de votre mot de passe BookList",
        html: `
          <p>Bonjour,</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe BookList.</p>
          <p><a href="${resetUrl}">Cliquez ici pour réinitialiser votre mot de passe</a></p>
          <p>Ce lien est valable 1 heure.</p>
          <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 })
  }
}
