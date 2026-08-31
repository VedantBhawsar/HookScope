import { Stamp } from "./stamp"

const T = {
  paper: "#f3efe4",
  paperDim: "#eae4d3",
  line: "#d9d2bc",
  text: "#2a2818",
  muted: "#6b6652",
  teal: "#3d8a7f",
  rust: "#a8432c",
  brass: "#c98a3a",
}

type EventRow = {
  id: string
  code: number
  word: string
  source: string
  path: string
  ms: number
  tone: "teal" | "rust"
  stamp?: boolean
}

const rows: EventRow[] = [
  { id: "evt_9xK2mP", code: 200, word: "DELIVERED", source: "stripe.com", path: "/webhooks/stripe", ms: 12, tone: "teal", stamp: true },
  { id: "evt_3nL8qR", code: 422, word: "REJECTED", source: "github.com", path: "/webhooks/github", ms: 8, tone: "rust" },
  { id: "evt_7vB4wT", code: 200, word: "DELIVERED", source: "shopify.com", path: "/webhooks/shopify", ms: 31, tone: "teal" },
  { id: "evt_1kF6yS", code: 500, word: "FAILED", source: "twilio.com", path: "/webhooks/twilio", ms: 145, tone: "rust" },
  { id: "evt_5hD2cU", code: 200, word: "DELIVERED", source: "sendgrid.com", path: "/webhooks/sendgrid", ms: 9, tone: "teal" },
]

function toneColor(tone: "teal" | "rust") {
  return tone === "teal" ? T.teal : T.rust
}

export function ManifestTicket() {
  return (
    <div
      style={{
        position: "relative",
        transform: "rotate(-1.2deg)",
      }}
    >
      {/* Stamp overlay — the page's one big signature moment */}
      <div
        className="stamp-impact"
        style={{
          "--stamp-rotate": "-9deg",
          position: "absolute",
          top: -18,
          right: 18,
          zIndex: 3,
        } as React.CSSProperties}
      >
        <span
          className="impact-ring"
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: 110,
            height: 110,
            borderRadius: "50%",
            border: `2px solid ${T.teal}`,
          }}
        />
        <Stamp id="hero-cleared" label="CLEARED" ringText="HOOKSCOPE · INSPECTED · " color="teal" rotate={-9} size={110} />
      </div>

      <div
        style={{
          backgroundColor: T.paper,
          border: `1px solid ${T.line}`,
          borderRadius: 6,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45), 0 2px 0 rgba(0,0,0,0.06)",
          fontFamily: "var(--font-mono, monospace)",
          overflow: "hidden",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            borderBottom: `1px solid ${T.line}`,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: T.paperDim,
          }}
        >
          <span style={{ fontSize: 11, color: T.muted, letterSpacing: "0.1em" }}>
            MANIFEST № 0847
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: T.teal,
              letterSpacing: "0.08em",
            }}
          >
            <span
              className="pulse-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: T.teal,
                display: "inline-block",
              }}
            />
            LIVE
          </span>
        </div>

        {/* Column headers */}
        <div
          style={{
            padding: "8px 20px",
            display: "grid",
            gridTemplateColumns: "96px 72px 1fr 84px 44px",
            gap: 12,
            borderBottom: `1px solid ${T.line}`,
            fontSize: 10,
            color: T.muted,
            letterSpacing: "0.1em",
          }}
        >
          <span>STATUS</span>
          <span>FROM</span>
          <span>ROUTE</span>
          <span>EVENT</span>
          <span style={{ textAlign: "right" }}>MS</span>
        </div>

        {/* Event rows */}
        <div>
          {rows.map((row, i) => (
            <div
              key={row.id}
              className="event-row"
              style={{
                padding: "9px 20px",
                display: "grid",
                gridTemplateColumns: "96px 72px 1fr 84px 44px",
                gap: 12,
                fontSize: 12,
                borderBottom: i < rows.length - 1 ? `1px solid ${T.line}` : undefined,
                backgroundColor: i === 0 ? "rgba(61,138,127,0.07)" : "transparent",
              }}
            >
              <span style={{ color: toneColor(row.tone), fontWeight: 700, letterSpacing: "0.01em" }}>
                {row.code} <span style={{ fontWeight: 500, opacity: 0.8 }}>{row.word}</span>
              </span>
              <span style={{ color: T.muted, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.source}
              </span>
              <span style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.path}
              </span>
              <span style={{ color: T.muted, fontSize: 11 }}>{row.id.slice(0, 10)}</span>
              <span style={{ color: T.muted, textAlign: "right", fontSize: 11 }}>{row.ms}ms</span>
            </div>
          ))}
        </div>

        {/* Payload strip */}
        <div
          style={{
            borderTop: `1px solid ${T.line}`,
            padding: "12px 20px",
            backgroundColor: T.paperDim,
            display: "flex",
            gap: 8,
            fontSize: 11,
            color: T.muted,
            letterSpacing: "0.02em",
            overflow: "hidden",
          }}
        >
          <span style={{ color: T.brass }}>▸ payload</span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            pi_3QkLpA2eZvKYlo2C · payment_intent.succeeded · amount 4999 usd
          </span>
        </div>
      </div>
    </div>
  )
}
