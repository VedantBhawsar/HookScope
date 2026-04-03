export interface WebhookPayload {
  /** Source identifier (e.g. "github", "stripe") */
  source: string
  /** ISO 8601 timestamp of when the webhook was received */
  receivedAt: string
  /** Raw payload forwarded by the provider */
  payload: unknown
  /** Optional headers forwarded from the incoming request */
  headers?: Record<string, string>
}

export interface IngestResponse {
  id: string
  status: "accepted"
  receivedAt: string
}
