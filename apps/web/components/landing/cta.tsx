import Link from "next/link"

const T = {
  bg: "#080d08",
  border: "#1a2a1a",
  text: "#c8d5c8",
  muted: "#5a6a5a",
  accent: "#39d353",
}

const commandLines = [
  { prefix: "$", text: "hookwatch init --endpoint https://api.yourapp.com", color: "#c8d5c8" },
  { prefix: ">", text: "Connecting to event stream...", color: "#5a6a5a" },
  { prefix: ">", text: "✓ Endpoint verified. Monitoring active.", color: "#39d353" },
  { prefix: ">", text: "247 events/min · 0 failures · 12ms p50 latency", color: "#39d353" },
]

export function CTA() {
  return (
    <section
      style={{
        fontFamily: "var(--font-display, monospace)",
        borderTop: `1px solid ${T.border}`,
        backgroundColor: T.bg,
        padding: "96px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          border: `1px solid ${T.border}`,
          padding: "64px",
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontSize: 11,
            color: T.accent,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          // GETTING STARTED
        </div>

        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(24px, 3.5vw, 40px)",
            fontWeight: 700,
            color: T.text,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          START MONITORING
          <br />
          IN UNDER 5 MINUTES
          <span className="cursor-blink" />
        </h2>

        <p
          style={{
            margin: "0 0 40px",
            fontSize: 13,
            lineHeight: 1.8,
            color: T.muted,
            maxWidth: 480,
            letterSpacing: "0.02em",
          }}
        >
          Point your webhook URL to HookWatch. No SDK, no agent, no code changes —
          just a proxy URL that captures everything.
        </p>

        {/* Terminal block */}
        <div
          style={{
            backgroundColor: "#050a05",
            border: `1px solid ${T.border}`,
            padding: "20px 24px",
            marginBottom: 36,
          }}
        >
          {commandLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                fontSize: 13,
                lineHeight: 1.9,
                fontFamily: "var(--font-display, monospace)",
              }}
            >
              <span style={{ color: T.accent, userSelect: "none" }}>{line.prefix}</span>
              <span style={{ color: line.color, letterSpacing: "0.02em" }}>{line.text}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <Link
            href="#"
            className="term-btn-primary"
            style={{
              padding: "12px 28px",
              backgroundColor: T.accent,
              color: "#050a05",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display, monospace)",
            }}
          >
            CREATE FREE ACCOUNT →
          </Link>
          <Link
            href="#"
            className="term-btn-ghost"
            style={{
              padding: "12px 28px",
              border: `1px solid ${T.border}`,
              color: T.muted,
              fontSize: 12,
              letterSpacing: "0.06em",
              fontFamily: "var(--font-display, monospace)",
            }}
          >
            read the docs
          </Link>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: T.muted, letterSpacing: "0.04em" }}>
          Free tier: 100,000 events/month · No credit card required
        </p>
      </div>
    </section>
  )
}
