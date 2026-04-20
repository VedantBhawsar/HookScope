import { Queue } from "bullmq"
import type { ConnectionOptions } from "bullmq"
import type { GitHubWebhookEvent } from "../types/github.js"

export const GITHUB_EVENT_QUEUE = "github:events"

export interface GitHubEventJob {
  endpointId: string
  destinationUrl: string
  deliveryId: string
  event: GitHubWebhookEvent
  eventType: string
  signature: string | null
  sourceIp: string | null
  sourceProvider: "GITHUB"
  hookId: string | null
  receivedAt: string
  bucket: string
}

export function createGitHubQueue(connection: ConnectionOptions): Queue<GitHubEventJob> {
  return new Queue<GitHubEventJob>(GITHUB_EVENT_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      // Linear backoff: 15s, 30s, 45s, 60s, 75s (configured on the worker)
      backoff: { type: "custom" },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  })
}
