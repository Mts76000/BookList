import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
} from "@react-email/components"

interface EmailDetail {
  label: string
  value: string
}

export interface EmailTemplateProps {
  projectName: string
  title: string
  message: string
  details?: EmailDetail[]
  ctaText?: string
  ctaUrl?: string
  footer?: string
}

export function EmailTemplate({
  projectName,
  title,
  message,
  details,
  ctaText,
  ctaUrl,
  footer,
}: EmailTemplateProps) {
  return (
    <Html lang="fr">
      <Head />
      <Body
        style={{
          backgroundColor: "#f8f3ea",
          color: "#241d15",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            padding: "32px",
            backgroundColor: "#fffcf5",
            borderRadius: "12px",
            border: "1px solid #e3d5bc",
          }}
        >
          <Section style={{ textAlign: "center", marginBottom: "24px" }}>
            <Heading
              as="h1"
              style={{
                fontFamily: "Georgia, serif",
                color: "#241d15",
                fontSize: "22px",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {projectName}
            </Heading>
          </Section>

          <Section>
            <Heading
              as="h2"
              style={{
                fontFamily: "Georgia, serif",
                color: "#241d15",
                fontSize: "20px",
                fontWeight: 600,
                margin: "0 0 16px",
              }}
            >
              {title}
            </Heading>

            <Text
              style={{
                fontSize: "16px",
                lineHeight: "24px",
                margin: "0 0 16px",
              }}
            >
              {message}
            </Text>

            {details && details.length > 0 && (
              <Section
                style={{
                  backgroundColor: "#f8f3ea",
                  borderRadius: "8px",
                  padding: "16px",
                  margin: "16px 0",
                }}
              >
                {details.map((detail) => (
                  <Text
                    key={detail.label}
                    style={{
                      fontSize: "14px",
                      margin: "0 0 8px",
                    }}
                  >
                    <strong style={{ color: "#6b5d49" }}>{detail.label} :</strong>{" "}
                    {detail.value}
                  </Text>
                ))}
              </Section>
            )}

            {ctaUrl && (
              <Section style={{ textAlign: "center", marginTop: "24px" }}>
                <Button
                  href={ctaUrl}
                  style={{
                    backgroundColor: "#ab4f27",
                    color: "#f8f3ea",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  {ctaText || "Voir"}
                </Button>
              </Section>
            )}
          </Section>

          <Section
            style={{
              borderTop: "1px solid #e3d5bc",
              marginTop: "32px",
              paddingTop: "16px",
            }}
          >
            <Text
              style={{
                fontSize: "12px",
                color: "#8a7a63",
                textAlign: "center",
                margin: 0,
              }}
            >
              {footer || `${projectName} — votre suivi de lecture personnel`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
