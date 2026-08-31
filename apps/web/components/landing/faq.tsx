const faqs = [
  {
    q: "Do you store my raw payloads?",
    a: "Yes — every payload is stored in full and kept for 30 days on the free tier, searchable by status, source, or path.",
  },
  {
    q: "Will this slow down my webhooks?",
    a: "No. Events are captured in under 5ms, independent of whether your own server is up or responding slowly.",
  },
  {
    q: "What happens if my server is down?",
    a: "HookScope holds the event and retries delivery with backoff. Nothing is dropped while you're offline.",
  },
  {
    q: "Is this safe to put in front of production traffic?",
    a: "Each endpoint gets its own signing secret — never a shared one across your account. Signatures are verified before anything reaches your app.",
  },
  {
    q: "Do I need to install anything?",
    a: "No SDK, no agent. Point your provider's webhook URL at the one HookScope gives you and it starts capturing immediately.",
  },
]

export function FAQ() {
  return (
    <section style={{ borderTop: "1px solid var(--ink-line)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 40 }}>
          <span
            style={{
              fontSize: 11,
              color: "var(--brass)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Questions on file
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
            Before you open an account
          </h2>
        </div>

        <div>
          {faqs.map((faq, i) => (
            <details
              key={faq.q}
              className="faq-item"
              style={{
                borderTop: i === 0 ? "1px solid var(--ink-line)" : undefined,
                borderBottom: "1px solid var(--ink-line)",
                padding: "20px 4px",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  fontSize: 15.5,
                  fontWeight: 600,
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                {faq.q}
                <span className="faq-icon" style={{ color: "var(--brass)", fontSize: 18, flexShrink: 0 }}>
                  +
                </span>
              </summary>
              <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.75, color: "var(--text-muted)", maxWidth: 640 }}>
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
