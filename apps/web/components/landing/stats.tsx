const stats = [
  { value: "10M+", label: "events logged / month" },
  { value: "99.9%", label: "uptime" },
  { value: "<5ms", label: "time to capture" },
  { value: "40+", label: "providers verified" },
]

export function Stats() {
  return (
    <section
      style={{
        backgroundColor: "var(--paper)",
        borderTop: "1px solid var(--paper-line)",
        borderBottom: "1px solid var(--paper-line)",
      }}
    >
      <div
        className="stats-grid"
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
            className={i > 0 ? "perforated" : undefined}
            style={{
              padding: "40px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: "clamp(32px, 4vw, 50px)",
                fontWeight: 800,
                color: "var(--brass-deep)",
                lineHeight: 1,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-stencil, sans-serif)",
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--paper-muted)",
                letterSpacing: "0.04em",
                fontFamily: "var(--font-mono, monospace)",
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
