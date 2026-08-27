import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface NotificationEmailProps {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Present for non-transactional sends only; transactional auth emails omit this. */
  unsubscribeUrl?: string;
}

/**
 * Generic, reusable transactional email template. Used for signup admin notification,
 * email verification, and password reset — pass different heading/body/CTA per use case
 * instead of creating a new template per email type.
 */
export default function NotificationEmail({
  heading,
  body,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
}: NotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif", padding: "24px 0" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "480px",
          }}
        >
          <Heading style={{ fontSize: "20px", margin: "0 0 16px" }}>{heading}</Heading>
          <Text style={{ fontSize: "14px", lineHeight: "22px", color: "#3f3f46" }}>{body}</Text>
          {ctaLabel && ctaUrl && (
            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button
                href={ctaUrl}
                style={{
                  backgroundColor: "#18181b",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                {ctaLabel}
              </Button>
            </Section>
          )}
          <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
          <Text style={{ fontSize: "12px", color: "#a1a1aa" }}>
            {unsubscribeUrl ? (
              <a href={unsubscribeUrl} style={{ color: "#a1a1aa" }}>
                Se désabonner
              </a>
            ) : (
              "Cet email est envoyé pour une action liée à votre compte."
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
