import Link from "next/link"

const steps = ["Create an endpoint", "Point your provider's webhook URL at it", "Watch events arrive — verified, logged, ready to replay"]

export function CTA() {
  return (
    <section
      style={{
        borderTop: "1px solid var(--ink-line)",
        backgroundColor: "var(--ink-3)",
        padding: "100px 24px",
      }}
    >
      <div
        className="cta-box"
        style={{
          maxWidth: 860,
          margin: "0 auto",
          border: "1px solid var(--ink-line)",
          borderRadius: 8,
          padding: "64px",
          backgroundColor: "var(--ink-2)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--brass)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 24,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          Getting started
        </div>

        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 800,
            color: "var(--text)",
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
            fontFamily: "var(--font-stencil, sans-serif)",
          }}
        >
          Point one URL.
          <br />
          We&apos;ll take it from there.
        </h2>

        <p
          style={{
            margin: "0 0 36px",
            fontSize: 15,
            lineHeight: 1.75,
            color: "var(--text-muted)",
            maxWidth: 480,
          }}
        >
          No SDK, no agent, no code changes — just a URL that captures everything
          sent to it.
        </p>

        <div
          style={{
            backgroundColor: "var(--paper)",
            borderRadius: 6,
            border: "1px solid var(--paper-line)",
            padding: "22px 26px",
            marginBottom: 32,
          }}
        >
          {steps.map((step, i) => (
            <div
              key={step}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "baseline",
                fontSize: 14,
                lineHeight: 2,
                fontFamily: "var(--font-mono, monospace)",
                borderBottom: i < steps.length - 1 ? "1px solid var(--paper-line)" : undefined,
              }}
            >
              <span style={{ color: "var(--brass-deep)", fontWeight: 700, flexShrink: 0 }}>
                {i + 1}.
              </span>
              <span style={{ color: "var(--paper-text)" }}>{step}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <Link
            href="/auth/register"
            className="btn-stamp-primary focus-ring"
            style={{
              padding: "14px 30px",
              backgroundColor: "var(--brass)",
              color: "var(--ink)",
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 4,
            }}
          >
            Create a free account →
          </Link>
          <Link
            href="#"
            className="btn-ghost-ink focus-ring"
            style={{
              padding: "14px 30px",
              border: "1px solid var(--ink-line)",
              color: "var(--text-muted)",
              fontSize: 14,
              borderRadius: 4,
            }}
          >
            Read the docs
          </Link>
        </div>

        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)" }}>
          Free up to 100,000 events a month. No credit card required.
        </p>
      </div>
    </section>
  )
}
