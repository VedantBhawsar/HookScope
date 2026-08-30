import Link from "next/link"

const T = {
  border: "#1a2a1a",
  text: "#c8d5c8",
  muted: "#5a6a5a",
  accent: "#39d353",
}

const columns: Record<string, string[]> = {
  PRODUCT: ["Features", "Changelog", "Pricing", "Status Page"],
  DEVELOPERS: ["Documentation", "API Reference", "GitHub", "SDK"],
  COMPANY: ["About", "Blog", "Privacy Policy", "Terms"],
}

export function Footer() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${T.border}`,
        fontFamily: "var(--font-display, monospace)",
        padding: "64px 24px 40px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 56,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className="phosphor-glow"
                style={{
                  width: 24,
                  height: 24,
                  border: `1px solid ${T.accent}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: T.accent,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                HS
              </div>
              <span style={{ fontSize: 13, color: T.text, fontWeight: 700, letterSpacing: "0.08em" }}>
                HOOKSCOPE
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.8,
                color: T.muted,
                letterSpacing: "0.02em",
                maxWidth: 220,
              }}
            >
              Webhook observability for engineering teams who ship.
            </p>
            <span
              style={{
                fontSize: 11,
                color: T.muted,
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: T.accent,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>

          {/* Link columns */}
          {Object.entries(columns).map(([group, links]) => (
            <div key={group} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.accent,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {group}
              </p>
              {links.map((link) => (
                <Link
                  key={link}
                  href={link === "Pricing" ? "/pricing" : "#"}
                  className="term-link"
                  style={{ fontSize: 12, letterSpacing: "0.04em" }}
                >
                  {link}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            color: T.muted,
            letterSpacing: "0.06em",
          }}
        >
          <span>© {new Date().getFullYear()} HOOKSCOPE. ALL RIGHTS RESERVED.</span>
          <span style={{ opacity: 0.5 }}>BUILT FOR ENGINEERS WHO HATE BLIND SPOTS.</span>
        </div>
      </div>
    </footer>
  )
}
