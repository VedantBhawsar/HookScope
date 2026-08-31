type Tone = "brass" | "teal" | "rust"

type Feature = {
  tag: string
  tone: Tone
  title: string
  description: string
}

const toneColor: Record<Tone, string> = {
  brass: "var(--brass)",
  teal: "var(--teal)",
  rust: "var(--rust)",
}

const features: Feature[] = [
  {
    tag: "RECEIVED",
    tone: "brass",
    title: "Real-time capture",
    description:
      "Every event is captured the instant it lands on your endpoint — no polling, no batching, no delay.",
  },
  {
    tag: "INSPECTED",
    tone: "teal",
    title: "Full payload inspection",
    description:
      "See the complete headers, body, and signature for any event. Search across every field, highlighted and diff-ready.",
  },
  {
    tag: "REPLAYED",
    tone: "brass",
    title: "One-click replay",
    description:
      "Resend any event — same payload, same headers — without asking the provider to try again.",
  },
  {
    tag: "ALERTED",
    tone: "rust",
    title: "Smart alerts",
    description:
      "Get told the moment something breaks: failure spikes, latency jumps, missing heartbeats. Routed to Slack, email, or PagerDuty.",
  },
  {
    tag: "VERIFIED",
    tone: "teal",
    title: "Signature verification",
    description:
      "HMAC checks for Stripe, GitHub, Shopify, Twilio, and 37 more. Catch a forged request before it reaches your app.",
  },
  {
    tag: "ARCHIVED",
    tone: "brass",
    title: "30-day searchable history",
    description:
      "Every event stays on file. Filter by status, source, or path — export or replay in bulk.",
  },
]

export function Features() {
  return (
    <section id="features">
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 24px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginBottom: 56,
            paddingBottom: 24,
            borderBottom: "1px solid var(--ink-line)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--brass)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            The ledger
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(24px, 3.4vw, 38px)",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              fontFamily: "var(--font-stencil, sans-serif)",
            }}
          >
            What gets logged on every delivery
          </h2>
        </div>
      </div>

      <div
        className="two-col-grid"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px 96px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 48px",
        }}
      >
        {features.map((f) => (
          <div
            key={f.tag}
            className="ledger-row"
            style={{
              padding: "32px 8px",
              borderTop: "1px solid var(--ink-line)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  backgroundColor: toneColor[f.tone],
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  color: toneColor[f.tone],
                  letterSpacing: "0.14em",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {f.tag}
              </span>
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {f.title}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 14.5,
                lineHeight: 1.75,
                color: "var(--text-muted)",
                maxWidth: 460,
              }}
            >
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
