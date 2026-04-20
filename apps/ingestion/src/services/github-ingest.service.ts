import { createHash } from "node:crypto"
import type { prisma } from "@workspace/db"
import type { GitHubWebhookEvent } from "../types/github.js"

type PrismaClient = typeof prisma

export interface IngestResult {
  webhookEventId: string
  endpointId: string
  payloadUrl: string
  isDuplicate: boolean
}

/**
 * Hashes an endpoint token with SHA-256 for lookup against `Endpoint.tokenHash`.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export interface GitHubEndpoint {
  id: string
  projectId: string
  signingSecret: string | null
  verificationMode: "NONE" | "OPTIONAL" | "STRICT"
  destinationUrl: string
  eventFilters: unknown
}

/**
 * Looks up an active GitHub endpoint by its token hash.
 * Returns null if the endpoint doesn't exist, is deleted, or is inactive.
 */
export async function findGitHubEndpoint(
  prisma: PrismaClient,
  tokenHash: string
): Promise<GitHubEndpoint | null> {
  return prisma.endpoint.findFirst({
    where: {
      tokenHash,
      source: "GITHUB",
      status: "active",
      deletedAt: null,
    },
    select: {
      id: true,
      projectId: true,
      signingSecret: true,
      verificationMode: true,
      destinationUrl: true,
      eventFilters: true,
    },
  })
}

/**
 * Creates the WebhookEvent + initial EventLog in a single transaction.
 * Returns `isDuplicate: true` if the event was already ingested (unique constraint).
 *
 * GitHub webhook delivery IDs are globally unique identifiers for each delivery attempt.
 * We use this as the eventId to ensure proper deduplication.
 */
export async function createWebhookEvent(
  prisma: PrismaClient,
  params: {
    endpointId: string
    deliveryId: string
    event: GitHubWebhookEvent
    eventType: string
    payloadUrl: string
    signature: string | null
    sourceIp: string | null
  }
): Promise<IngestResult> {
  const { endpointId, deliveryId, event, eventType, payloadUrl, signature, sourceIp } = params

  try {
    const webhookEvent = await prisma.$transaction(async (tx) => {
      const created = await tx.webhookEvent.create({
        data: {
          endpointId,
          eventId: deliveryId,
          source: "GITHUB",
          eventType,
          signature: signature ? { raw: signature } : undefined,
          payloadUrl,
          status: "RECEIVED",
          sourceIp,
        },
      })

      await tx.eventLog.create({
        data: {
          webhookEventId: created.id,
          status: "INFO",
          type: "EVENT_RECEIVED",
          message: `GitHub event ${eventType} received (${deliveryId})`,
        },
      })

      return created
    })

    return {
      webhookEventId: webhookEvent.id,
      endpointId,
      payloadUrl,
      isDuplicate: false,
    }
  } catch (err: unknown) {
    // Prisma unique constraint violation → duplicate event
    if (isPrismaUniqueError(err)) {
      const existing = await prisma.webhookEvent.findUnique({
        where: { endpointId_eventId: { endpointId, eventId: deliveryId } },
        select: { id: true },
      })

      return {
        webhookEventId: existing?.id ?? "unknown",
        endpointId,
        payloadUrl,
        isDuplicate: true,
      }
    }
    throw err
  }
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  )
}
