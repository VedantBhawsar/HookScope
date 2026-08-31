import Link from "next/link"
import { ManifestTicket } from "./manifest-ticket"

export function Hero() {
  return (
    <section
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        padding: "96px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div
          className="hero-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.05fr",
            gap: 72,
            alignItems: "center",
          }}
        >
          {/* Copy */}
          <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 11,
                color: "var(--brass)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--brass)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              Live manifest · zero backlog
            </div>

            <h1
              style={{
                fontSize: "clamp(42px, 6.4vw, 84px)",
                fontWeight: 800,
                lineHeight: 0.98,
                color: "var(--text)",
                margin: 0,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                fontFamily: "var(--font-stencil, sans-serif)",
              }}
            >
              Every webhook
              <br />
              that arrives
              <br />
              <span style={{ color: "var(--brass)" }}>gets a receipt.</span>
            </h1>

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.75,
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: 440,
              }}
            >
              HookScope sits in front of every endpoint you own. Each delivery gets
              captured, signature-checked, and filed — so you always know what came
              in, when, and what happened after.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/auth/register"
                className="btn-stamp-primary focus-ring"
                style={{
                  padding: "13px 26px",
                  backgroundColor: "var(--brass)",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: 4,
                }}
              >
                Start monitoring →
              </Link>
              <Link
                href="#"
                className="btn-ghost-ink focus-ring"
                style={{
                  padding: "13px 26px",
                  border: "1px solid var(--ink-line)",
                  color: "var(--text-muted)",
                  fontSize: 14,
                  borderRadius: 4,
                }}
              >
                Read the docs
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                gap: 22,
                fontSize: 12.5,
                color: "var(--text-muted)",
                paddingTop: 6,
                flexWrap: "wrap",
              }}
            >
              {["No code changes", "100,000 free events/mo", "40+ providers verified"].map((item) => (
                <span key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "var(--teal)" }}>✓</span> {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <ManifestTicket />
          </div>
        </div>
      </div>
    </section>
  )
}
