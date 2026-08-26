import { Resend } from "resend"
import { render } from "@react-email/render"
import { NewUserNotification } from "@/emails/NewUserNotification"

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

const fromEmail = () =>
  process.env.RESEND_FROM_EMAIL || "noreply@booklist.app"

const adminEmail = () =>
  process.env.ADMIN_EMAIL

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000"

/**
 * Envoie une notification à l'administrateur lorsqu'un nouvel utilisateur s'inscrit.
 * L'envoi est silencieux en cas d'erreur pour ne pas bloquer l'inscription.
 */
export async function sendNewUserNotificationEmail(userEmail: string) {
  const admin = adminEmail()
  if (!admin) {
    console.warn("ADMIN_EMAIL is not set, skipping admin notification")
    return
  }

  const resend = getResend()
  if (!resend) {
    console.warn("RESEND_API_KEY is not set, skipping admin notification")
    return
  }

  try {
    const html = await render(
      <NewUserNotification
        userEmail={userEmail}
        registeredAt={new Date()}
        adminUrl={`${siteUrl()}/dashboard`}
      />
    )

    await resend.emails.send({
      from: fromEmail(),
      to: admin,
      subject: "Nouvelle inscription sur BookList",
      html,
    })
  } catch (error) {
    console.error("Failed to send admin notification:", error)
  }
}
