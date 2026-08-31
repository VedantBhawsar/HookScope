import Link from "next/link"

const columns: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Status", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Developers: [
    { label: "Docs", href: "#" },
    { label: "API reference", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "SDK", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Privacy policy", href: "#" },
    { label: "Terms", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--ink-line)", padding: "72px 24px 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 56,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  border: "1.5px solid var(--brass)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "var(--brass)",
                  fontWeight: 800,
                  fontFamily: "var(--font-stencil, sans-serif)",
                  transform: "rotate(-3deg)",
                }}
              >
                HS
              </div>
              <span
                style={{
                  fontSize: 15,
                  color: "var(--text)",
                  fontWeight: 700,
                  fontFamily: "var(--font-stencil, sans-serif)",
                }}
              >
                HookScope
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.75,
                color: "var(--text-muted)",
                maxWidth: 230,
              }}
            >
              Webhook observability for teams who need a receipt for everything
              that happens.
            </p>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              <span
                className="pulse-dot"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "var(--teal)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              All systems operational
            </span>
          </div>

          {Object.entries(columns).map(([group, links]) => (
            <div key={group} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--brass)",
                  letterSpacing: "0.1em",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {group}
              </p>
              {links.map((link) => (
                <Link key={link.label} href={link.href} className="manifest-link focus-ring" style={{ fontSize: 13.5 }}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--ink-line)",
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12.5,
            color: "var(--text-muted)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>© {new Date().getFullYear()} HookScope. All rights reserved.</span>
          <span style={{ opacity: 0.7 }}>Built for engineers who hate finding out the hard way.</span>
        </div>
      </div>
    </footer>
  )
}
