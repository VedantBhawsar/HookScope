import Link from "next/link"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "#" },
  { label: "Status", href: "#" },
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
        borderBottom: "1px solid var(--ink-line)",
        backgroundColor: "rgba(20,21,31,0.88)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          className="manifest-link focus-ring"
          style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text)" }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 4,
              border: "1.5px solid var(--brass)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
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
              fontSize: 18,
              color: "var(--text)",
              fontWeight: 700,
              fontFamily: "var(--font-stencil, sans-serif)",
              letterSpacing: "0.01em",
            }}
          >
            HookScope
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span className="nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="manifest-link focus-ring"
                style={{ fontSize: 13.5 }}
              >
                {link.label}
              </Link>
            ))}
          </span>

          <Link
            href="/auth/login"
            className="manifest-link focus-ring nav-links"
            style={{ fontSize: 13.5 }}
          >
            Sign in
          </Link>

          <Link
            href="/auth/register"
            className="btn-stamp-primary focus-ring"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink)",
              backgroundColor: "var(--brass)",
              borderRadius: 4,
              padding: "8px 16px",
            }}
          >
            Start monitoring
          </Link>
        </nav>
      </div>
    </header>
  )
}
