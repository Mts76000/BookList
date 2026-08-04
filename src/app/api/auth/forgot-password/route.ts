import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@booklist.app"
const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 })
    }

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
