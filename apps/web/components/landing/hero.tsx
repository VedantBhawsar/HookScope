import Link from "next/link"
import { WebhookTerminal } from "./webhook-terminal"

const T = {
  text: "#c8d5c8",
  muted: "#5a6a5a",
  accent: "#39d353",
  border: "#1a2a1a",
}

export function Hero() {
  return (
    <section
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        padding: "80px 24px 48px",
        fontFamily: "var(--font-display, monospace)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          {/* Left: Copy */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Eyebrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 11,
                color: T.accent,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: T.accent,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              SYSTEM ONLINE · v0.9.1-beta
            </div>

            {/* Headline */}
            <div>
              <h1
                style={{
                  fontSize: "clamp(36px, 5vw, 62px)",
                  fontWeight: 700,
                  lineHeight: 1.05,
                  color: T.text,
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                <span style={{ display: "block" }}>FULL</span>
                <span
                  className="phosphor-glow"
                  style={{ display: "block", color: T.accent }}
                >
                  VISIBILITY
                </span>
                <span style={{ display: "block" }}>INTO EVERY</span>
                <span style={{ display: "block" }}>
                  WEBHOOK<span className="cursor-blink" />
                </span>
              </h1>
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: T.muted,
                margin: 0,
                maxWidth: 420,
                letterSpacing: "0.02em",
              }}
            >
              Capture, inspect, and replay every event in real time.
              Know exactly what arrived, when, and whether it succeeded —
              without touching your application code.
            </p>

            {/* CTA row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="#"
                className="term-btn-primary"
                style={{
                  padding: "11px 22px",
                  backgroundColor: T.accent,
                  color: "#050a05",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display, monospace)",
                }}
              >
                $ START_MONITORING →
              </Link>
              <Link
                href="#"
                className="term-btn-ghost"
                style={{
                  padding: "11px 22px",
                  border: `1px solid ${T.border}`,
                  color: T.muted,
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  fontFamily: "var(--font-display, monospace)",
                }}
              >
                view docs
              </Link>
            </div>

            {/* Micro-trust bar */}
            <div
              style={{
                display: "flex",
                gap: 20,
                fontSize: 11,
                color: T.muted,
                letterSpacing: "0.04em",
                paddingTop: 4,
              }}
            >
              {["No SDK required", "Free 100K evt/mo", "SOC 2 Type II"].map((item) => (
                <span key={item} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: T.accent }}>✓</span> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Terminal */}
          <div>
            <WebhookTerminal />
          </div>
        </div>
      </div>
    </section>
  )
}
