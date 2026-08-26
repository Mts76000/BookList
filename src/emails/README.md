# Emails transactionnels

Le projet utilise [Resend](https://resend.com) pour l’envoi d’emails et `@react-email/components` pour les templates en JSX.

## Architecture

- `EmailTemplate.tsx` : template de base réutilisable (en-tête, titre, message, détails, CTA, pied de page).
- `NewUserNotification.tsx` : wrapper concret pour la notification "nouvel utilisateur inscrit".
- `lib/email.tsx` : fonctions d’envoi (`sendNewUserNotificationEmail`, etc.).

## Ajouter un nouvel email

1. **Créer le wrapper** (facultatif) ou utiliser directement `<EmailTemplate />`.

```tsx
// src/emails/PasswordChangedNotification.tsx
import { EmailTemplate } from "./EmailTemplate"

export function PasswordChangedNotification({ userEmail, changedAt }: { userEmail: string; changedAt: Date }) {
  return (
    <EmailTemplate
      projectName="BookList"
      title="Mot de passe modifié"
      message="Un utilisateur a modifié son mot de passe."
      details={[
        { label: "Email", value: userEmail },
        { label: "Date", value: changedAt.toLocaleString("fr-FR") },
      ]}
      footer="BookList — notification automatique"
    />
  )
}
```

2. **Ajouter la fonction d’envoi** dans `src/lib/email.tsx`.

```tsx
import { PasswordChangedNotification } from "@/emails/PasswordChangedNotification"

export async function sendPasswordChangedNotification(userEmail: string) {
  const admin = adminEmail()
  if (!admin || !getResend()) return

  const html = await render(
    <PasswordChangedNotification userEmail={userEmail} changedAt={new Date()} />
  )

  await getResend()!.emails.send({
    from: fromEmail(),
    to: admin,
    subject: "Mot de passe modifié",
    html,
  })
}
```

3. **Brancher l’appel** dans la route ou le service métier concerné.

## Bonnes pratiques

- Utilisez toujours `<EmailTemplate />` pour conserver l’identité visuelle.
- Préférez des `details` plutôt qu’un gros bloc de texte.
- N’écrivez jamais d’adresse email en dur : utilisez `ADMIN_EMAIL`, `RESEND_FROM_EMAIL`, etc.
- Gérez les erreurs d’envoi sans bloquer l’action utilisateur.
