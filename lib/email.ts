import { Resend } from "resend";
import { render } from "@react-email/components";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import NotificationEmail from "@/emails/notification-email";

const resend = new Resend(env.RESEND_API_KEY);
const appName = env.NEXT_PUBLIC_APP_NAME;

interface SendArgs {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/**
 * Sends a transactional email via Resend. Never throws — a Resend outage must not break
 * the caller's actual operation (signup, password reset, etc.); failures are just logged.
 */
async function sendTransactionalEmail({ to, subject, heading, body, ctaLabel, ctaUrl }: SendArgs) {
  // Dev convenience: without a real RESEND_API_KEY, sending fails but the flow (email
  // verification, password reset, email change) still needs its magic link somehow. Log it
  // so it can be copy-pasted instead of blocking on a Resend account for local development.
  if (env.NODE_ENV === "development" && ctaUrl) {
    logger.info({ to, subject, ctaUrl }, "Email link (dev only, not actually sent)");
  }

  try {
    const html = await render(NotificationEmail({ heading, body, ctaLabel, ctaUrl }));
    await resend.emails.send({
      from: env.CONTACT_EMAIL,
      to,
      subject: `[${appName}] ${subject}`,
      html,
    });
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email via Resend");
  }
}

export async function sendVerificationEmail(to: string, url: string) {
  await sendTransactionalEmail({
    to,
    subject: "Vérifiez votre adresse email",
    heading: "Vérifiez votre adresse email",
    body: "Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.",
    ctaLabel: "Vérifier mon email",
    ctaUrl: url,
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await sendTransactionalEmail({
    to,
    subject: "Réinitialisation de votre mot de passe",
    heading: "Réinitialisation de mot de passe",
    body: "Vous avez demandé la réinitialisation de votre mot de passe. Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    ctaLabel: "Réinitialiser mon mot de passe",
    ctaUrl: url,
  });
}

export async function sendChangeEmailVerification(oldEmail: string, newEmail: string, url: string) {
  await sendTransactionalEmail({
    to: oldEmail,
    subject: "Confirmation de changement d'adresse email",
    heading: "Changement d'adresse email demandé",
    body: `Une demande de changement d'adresse email vers ${newEmail} a été effectuée sur votre compte. Cliquez ci-dessous pour la confirmer.`,
    ctaLabel: "Confirmer le changement",
    ctaUrl: url,
  });
}

export async function sendSignupAdminNotification(userEmail: string) {
  await sendTransactionalEmail({
    to: env.CONTACT_EMAIL,
    subject: `Nouvelle inscription sur ${appName}`,
    heading: `Nouvelle inscription sur ${appName}`,
    body: `Un nouvel utilisateur vient de s'inscrire sur ${appName} : ${userEmail}.`,
  });
}
