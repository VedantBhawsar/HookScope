const providers = [
  "Stripe",
  "GitHub",
  "Shopify",
  "Twilio",
  "SendGrid",
  "Slack",
  "PayPal",
  "Square",
  "Mailgun",
  "Intercom",
  "Vercel",
  "Clerk",
]

export function Integrations() {
  return (
    <section style={{ borderTop: "1px solid var(--ink-line)", backgroundColor: "var(--ink-2)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--brass)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            The dock
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
            Every provider lands in the same manifest
          </h2>
        </div>
        <p style={{ margin: "0 0 40px", fontSize: 14.5, lineHeight: 1.75, color: "var(--text-muted)", maxWidth: 560 }}>
          Signatures are verified for 40+ providers out of the box. Don&apos;t see yours below?
          Any provider still works — add its signing secret when you&apos;re ready, or leave
          verification off while you wire things up.
        </p>

        <div
          className="provider-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {providers.map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "14px 18px",
                border: "1px solid var(--ink-line)",
                borderRadius: 5,
                fontSize: 14,
                color: "var(--text)",
              }}
            >
              {name}
              <span style={{ color: "var(--teal)", fontSize: 12 }}>✓</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 18px",
              border: "1px dashed var(--ink-line)",
              borderRadius: 5,
              fontSize: 13,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            + 28 more
          </div>
        </div>
      </div>
    </section>
  )
}
