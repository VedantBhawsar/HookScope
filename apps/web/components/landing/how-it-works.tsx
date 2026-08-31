const steps = [
  {
    title: "The provider sends it",
    description:
      "Stripe, GitHub, Shopify — any provider posts to the unique URL HookScope gives your endpoint, not your server directly.",
  },
  {
    title: "The signature gets checked",
    description:
      "HMAC verified against that endpoint's own signing secret. A forged or tampered request gets flagged, not forwarded.",
  },
  {
    title: "The event gets filed",
    description:
      "The full payload is stored durably. Metadata lands in Postgres and is cached for instant lookups on the dashboard.",
  },
  {
    title: "It reaches your app",
    description:
      "Forwarded to your real endpoint. If delivery fails, HookScope retries with backoff and tracks every attempt.",
  },
]

export function HowItWorks() {
  return (
    <section style={{ borderTop: "1px solid var(--ink-line)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginBottom: 56,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--brass)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            The route
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
            What happens between sent and delivered
          </h2>
        </div>

        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 21,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "var(--ink-line)",
            }}
          />
          <div
            className="route-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 32,
              position: "relative",
            }}
          >
            {steps.map((step, i) => (
              <div key={step.title} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    border: "1.5px solid var(--brass)",
                    backgroundColor: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--brass)",
                    fontFamily: "var(--font-stencil, sans-serif)",
                    zIndex: 1,
                  }}
                >
                  {i + 1}
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                  {step.title}
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "var(--text-muted)" }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
