const T = {
  border: "#1a2a1a",
  text: "#c8d5c8",
  muted: "#5a6a5a",
  accent: "#39d353",
}

type Feature = {
  num: string
  title: string
  description: string
  tag: string
}

const features: Feature[] = [
  {
    num: "01",
    title: "REAL-TIME STREAM",
    description:
      "Every event captured the moment it hits your endpoint. No polling, no delays — pure event push over WebSocket with sub-5ms delivery.",
    tag: "INGEST",
  },
  {
    num: "02",
    title: "PAYLOAD INSPECTOR",
    description:
      "Full headers, body, query params, and signatures. Search and filter across every field. Syntax-highlighted, diff-ready.",
    tag: "INSPECT",
  },
  {
    num: "03",
    title: "ONE-CLICK REPLAY",
    description:
      "Resend any event, any time — failed, successful, or historical. Exact same payload, headers, and timing. No re-triggering your provider.",
    tag: "REPLAY",
  },
  {
    num: "04",
    title: "SMART ALERTING",
    description:
      "Failure patterns, latency spikes, missing heartbeats. Route alerts to Slack, PagerDuty, email, or any webhook URL.",
    tag: "ALERT",
  },
  {
    num: "05",
    title: "SIGNATURE VERIFY",
    description:
      "HMAC validation for Stripe, GitHub, Shopify, Twilio, and 37 more. Catch spoofed or tampered requests before they reach your app.",
    tag: "SECURITY",
  },
  {
    num: "06",
    title: "30-DAY HISTORY",
    description:
      "Full searchable log. Filter by status code, source domain, path, payload content, or time range. Export to CSV or replay in bulk.",
    tag: "HISTORY",
  },
]

export function Features() {
  return (
    <section
      id="features"
      style={{ fontFamily: "var(--font-display, monospace)" }}
    >
      {/* Section header */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "80px 24px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginBottom: 48,
            paddingBottom: 24,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: T.accent,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            CAPABILITIES
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(22px, 3vw, 32px)",
              fontWeight: 700,
              color: T.text,
              letterSpacing: "-0.01em",
            }}
          >
            BUILT FOR PRODUCTION DEBUGGING
          </h2>
        </div>
      </div>

      {/* Feature grid — 2 columns, border-separated cells */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px 80px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderTop: `1px solid ${T.border}`,
          borderLeft: `1px solid ${T.border}`,
        }}
      >
        {features.map((f) => (
          <div
            key={f.num}
            style={{
              padding: "40px 36px",
              borderRight: `1px solid ${T.border}`,
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Number + tag */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                className="phosphor-glow"
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: `${T.accent}30`,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {f.num}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: T.accent,
                  letterSpacing: "0.14em",
                  border: `1px solid ${T.border}`,
                  padding: "3px 8px",
                }}
              >
                {f.tag}
              </span>
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: T.text,
                letterSpacing: "0.08em",
              }}
            >
              {f.title}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.8,
                color: T.muted,
                letterSpacing: "0.02em",
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
