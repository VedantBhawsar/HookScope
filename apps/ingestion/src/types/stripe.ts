/**
 * Minimal Stripe webhook event shape.
 * Only the fields we inspect at the ingestion boundary are typed here.
 * The full `data.object` remains `unknown` intentionally — we store it raw.
 */
export interface StripeWebhookEvent {
  /** Unique event ID, e.g. "evt_1NirD82eZvKYlo2CIvbtLWuY" */
  id: string
  /** Always "event" */
  object: "event"
  /** Dot-separated event name, e.g. "payment_intent.succeeded" */
  type: string
  /** Unix timestamp (seconds) when the event was created */
  created: number
  /** Whether this is a live-mode event */
  livemode: boolean
  /** Stripe API version that generated this event */
  api_version: string | null
  /** The object that triggered the event */
  data: {
    object: unknown
    previous_attributes?: unknown
  }
}

export interface StripeIngestResponse {
  received: boolean
  eventId?: string
  type?: string
  duplicate?: boolean
}
