import { Html, Head, Body, Container, Section, Text, Link, Img } from "@react-email/components"

export type GameRecordingEmailProps = {
  recipients: string // comma-separated emails
  videoUrl: string
}

export const GameRecordingEmail = ({ recipients, videoUrl }: GameRecordingEmailProps) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial, sans-serif", backgroundColor: "#f9f9f9" }}>
      <Container
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          padding: "24px",
          borderRadius: "8px",
        }}
      >
        {/* Logo */}
        <Section style={{ textAlign: "center", marginBottom: "24px" }}>
          <Img
            src="https://ffuq0pf52dpcvo3q.public.blob.vercel-storage.com/pickleballbook-resources/pickl.digos.png"
            alt="Company Logo"
            width="120"
            height="auto"
            style={{ margin: "0 auto" }}
          />
        </Section>

        {/* Header */}
        <Text
          style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px", color: "#2d3748" }}
        >
          🎥 Game Recording Available
        </Text>

        {/* Greeting */}
        <Text style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
          Hello, here’s the recording of your recent game. The link below will let you watch or
          download the video:
        </Text>

        {/* Video Link */}
        <Section style={{ marginBottom: "20px" }}>
          <Link href={videoUrl} style={{ fontSize: "16px", color: "#1a73e8", fontWeight: "600" }}>
            ▶ Watch Game Recording
          </Link>
        </Section>

        {/* Footer */}
        <Text style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
          This link may expire after a certain period. Please save it if you’d like to keep a copy.
          For any questions, contact as on facebook.
        </Text>
      </Container>
    </Body>
  </Html>
)
