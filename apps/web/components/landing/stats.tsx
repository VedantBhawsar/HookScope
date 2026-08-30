const T = {
  bg: "#080d08",
  border: "#1a2a1a",
  text: "#c8d5c8",
  muted: "#5a6a5a",
  accent: "#39d353",
}

const stats = [
  { value: "10M+", label: "events / month" },
  { value: "99.9%", label: "uptime SLA" },
  { value: "<5ms", label: "capture latency" },
  { value: "40+", label: "provider integrations" },
]

export function Stats() {
  return (
    <section
      style={{
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        backgroundColor: T.bg,
        fontFamily: "var(--font-display, monospace)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: "40px 32px",
              borderRight: i < 3 ? `1px solid ${T.border}` : undefined,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span
              className="phosphor-glow"
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 700,
                color: T.accent,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontSize: 11,
                color: T.muted,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
