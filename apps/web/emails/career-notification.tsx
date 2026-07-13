import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "react-email";

export function CareerNotificationEmail({ subject, preview, body, actionUrl, actionLabel = "Open Career OS" }: { subject: string; preview: string; body: string; actionUrl: string; actionLabel?: string }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f5f5f4", color: "#171717", fontFamily: "Arial, sans-serif", margin: 0, padding: "32px 12px" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 12, margin: "0 auto", maxWidth: 560, padding: 28 }}>
          <Text style={{ color: "#166534", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" }}>Career OS</Text>
          <Heading style={{ fontSize: 24, lineHeight: 1.25, margin: "12px 0" }}>{subject}</Heading>
          <Text style={{ color: "#44403c", fontSize: 16, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{body}</Text>
          <Section style={{ marginTop: 24 }}><Button href={actionUrl} style={{ backgroundColor: "#171717", borderRadius: 8, color: "#ffffff", display: "inline-block", fontSize: 14, fontWeight: 600, padding: "12px 18px", textDecoration: "none" }}>{actionLabel}</Button></Section>
          <Text style={{ color: "#78716c", fontSize: 12, lineHeight: 1.5, marginTop: 28 }}>Career OS will never send outreach or submit an application for you. Review and act from the web dashboard.</Text>
        </Container>
      </Body>
    </Html>
  );
}
