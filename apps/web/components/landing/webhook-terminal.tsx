const T = {
  surface: "#080d08",
  border: "#1a2a1a",
  text: "#c8d5c8",
  muted: "#5a6a5a",
  accent: "#39d353",
  error: "#ff5555",
  warn: "#f0c040",
}

type EventEntry = {
  id: string
  status: number
  method: string
  path: string
  source: string
  ms: number
  delay?: number
}

const events: EventEntry[] = [
  { id: "evt_9xK2mP", status: 200, method: "POST", path: "/webhooks/stripe", source: "stripe.com", ms: 12 },
  { id: "evt_3nL8qR", status: 422, method: "POST", path: "/webhooks/github", source: "github.com", ms: 8 },
  { id: "evt_7vB4wT", status: 200, method: "POST", path: "/webhooks/shopify", source: "shopify.com", ms: 31 },
  { id: "evt_1kF6yS", status: 500, method: "POST", path: "/webhooks/twilio", source: "twilio.com", ms: 145 },
  { id: "evt_5hD2cU", status: 200, method: "POST", path: "/webhooks/sendgrid", source: "sendgrid.com", ms: 9 },
]

const payload = `{
  "id": "evt_9xK2mP",
  "type": "payment_intent.succeeded",
  "created": 1735900812,
  "data": {
    "object": {
      "id": "pi_3QkLpA2eZvKYlo2C",
      "amount": 4999,
      "currency": "usd",
      "status": "succeeded",
      "customer": "cus_Qq7VKLzx9mRt4P"
    }
  },
  "livemode": true,
  "api_version": "2024-06-20"
}`

function statusColor(code: number) {
  if (code >= 200 && code < 300) return T.accent
  if (code >= 400 && code < 500) return T.warn
  return T.error
}

export function WebhookTerminal() {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        backgroundColor: T.surface,
        fontFamily: "var(--font-display, monospace)",
        overflow: "hidden",
      }}
      className="crt-flicker"
    >
      {/* Title bar */}
      <div
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#050a05",
        }}
      >
        <span style={{ fontSize: 11, color: T.muted, letterSpacing: "0.08em" }}>
          HOOKSCOPE — LIVE STREAM
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: T.accent,
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
            }}
          />
          MONITORING
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          padding: "6px 16px",
          display: "grid",
          gridTemplateColumns: "50px 36px 60px 1fr 80px 48px",
          gap: 12,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 10,
          color: T.muted,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        <span>STATUS</span>
        <span>MTD</span>
        <span>SOURCE</span>
        <span>PATH</span>
        <span>EVENT_ID</span>
        <span style={{ textAlign: "right" }}>MS</span>
      </div>

      {/* Event rows */}
      <div>
        {events.map((ev, i) => (
          <div
            key={ev.id}
            className="event-stream-row"
            style={{
              padding: "7px 16px",
              display: "grid",
              gridTemplateColumns: "50px 36px 60px 1fr 80px 48px",
              gap: 12,
              fontSize: 12,
              borderBottom: `1px solid ${T.border}40`,
              backgroundColor: i === 0 ? `${T.accent}08` : "transparent",
              animationDelay: `${i * 60}ms`,
              opacity: i === 0 ? 1 : 0.65,
            }}
          >
            <span
              style={{
                color: statusColor(ev.status),
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {ev.status}
            </span>
            <span style={{ color: T.muted, fontSize: 11 }}>{ev.method}</span>
            <span style={{ color: T.muted, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ev.source}
            </span>
            <span style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ev.path}
            </span>
            <span style={{ color: T.muted, fontSize: 11 }}>{ev.id.slice(0, 10)}</span>
            <span style={{ color: T.muted, textAlign: "right", fontSize: 11 }}>{ev.ms}ms</span>
          </div>
        ))}
      </div>

      {/* Payload inspector */}
      <div
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: 16,
          backgroundColor: "#060b06",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            fontSize: 11,
            color: T.muted,
            letterSpacing: "0.08em",
          }}
        >
          <span>▶ PAYLOAD</span>
          <span style={{ color: T.accent }}>evt_9xK2mP</span>
          <span style={{ marginLeft: "auto" }}>stripe.com · payment_intent.succeeded</span>
        </div>
        <pre
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.7,
            color: "#8fa88f",
            overflowX: "auto",
          }}
        >
          <code>{payload}</code>
        </pre>
      </div>
    </div>
  )
}
