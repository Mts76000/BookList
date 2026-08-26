import { EmailTemplate } from "./EmailTemplate"

export interface NewUserNotificationProps {
  userEmail: string
  registeredAt: Date
  adminUrl: string
}

export function NewUserNotification({
  userEmail,
  registeredAt,
  adminUrl,
}: NewUserNotificationProps) {
  return (
    <EmailTemplate
      projectName="BookList"
      title="Nouvel utilisateur inscrit"
      message="Un nouvel utilisateur vient de créer un compte sur BookList."
      details={[
        { label: "Email", value: userEmail },
        { label: "Date d'inscription", value: registeredAt.toLocaleString("fr-FR") },
      ]}
      ctaText="Ouvrir le tableau de bord"
      ctaUrl={adminUrl}
      footer="BookList — notification automatique"
    />
  )
}
