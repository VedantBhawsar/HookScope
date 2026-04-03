import Link from "next/link"

const T = {
  bg: "#050a05",
  border: "#1a2a1a",
  text: "#c8d5c8",
  muted: "#5a6a5a",
  accent: "#39d353",
}

const navLinks = [
  { label: "docs", href: "#" },
  { label: "status", href: "#" },
  { label: "pricing", href: "#" },
  { label: "github", href: "#" },
]

export function Navbar() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: `1px solid ${T.border}`,
        backgroundColor: `${T.bg}ee`,
        backdropFilter: "blur(8px)",
        fontFamily: "var(--font-display, monospace)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" className="term-link" style={{ display: "flex", alignItems: "center", gap: 10, color: T.text }}>
          <div
            className="phosphor-glow"
            style={{
              width: 28,
              height: 28,
              border: `1px solid ${T.accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: T.accent,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            HW
          </div>
          <span
            style={{
              fontSize: 13,
              color: T.text,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            HOOKWATCH
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="term-link"
              style={{ fontSize: 12, letterSpacing: "0.06em" }}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="#"
            className="term-btn-primary phosphor-glow"
            style={{
              fontSize: 12,
              color: T.accent,
              letterSpacing: "0.06em",
              border: `1px solid ${T.accent}`,
              padding: "6px 14px",
            }}
          >
            get_started →
          </Link>
        </nav>
      </div>
    </header>
  )
}
