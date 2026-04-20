/**
 * Minimal GitHub webhook event shape.
 * Only the fields we inspect at the ingestion boundary are typed here.
 * The full event payload remains `unknown` intentionally — we store it raw.
 *
 * See: https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads
 */
export interface GitHubWebhookEvent {
  /** GitHub action identifier, e.g. "opened", "closed", "synchronize" */
  action?: string

  /** Organization/Repository name event originated from */
  repository?: {
    id: number
    name: string
    full_name: string
  }

  /** Event type (mapped from delivery header), e.g. "push", "pull_request", "issues" */
  [key: string]: unknown
}

export interface GitHubIngestResponse {
  received: boolean
  deliveryId?: string
  action?: string
  repository?: string
  queued?: boolean
}
