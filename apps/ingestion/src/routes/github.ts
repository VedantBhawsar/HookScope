import type { FastifyPluginAsync } from "fastify"
import { LogType } from "@workspace/db"
import { verifyGitHubSignature } from "../lib/github-verify.js"
import { hashToken, findGitHubEndpoint, createWebhookEvent } from "../services/github-ingest.service.js"
import type { GitHubWebhookEvent, GitHubIngestResponse } from "../types/github.js"

interface GitHubRouteParams {
  token: string
}

const githubRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /webhooks/github/:token
   *
   * Hot path — only does two things before responding:
   *   1. Token lookup + signature verification (security gate, must be sync)
   *   2. Enqueue job to Redis (BullMQ) — ~1ms
   *
   * All persistence (S3, DB, Redis cache, forwarding) runs in the background worker.
   *
   * GitHub-specific headers:
   *   - X-Hub-Signature-256: HMAC-SHA256 signature (format: "sha256=<hex>")
   *   - X-GitHub-Delivery: Unique UUID for this delivery attempt (deduplication key)
   *   - X-GitHub-Event: Event type (e.g., "push", "pull_request", "issues")
   *   - X-GitHub-Hook-ID: GitHub webhook configuration ID
   */
  fastify.post<{ Params: GitHubRouteParams; Reply: GitHubIngestResponse }>(
    "/webhooks/github/:token",
    async (request, reply) => {
      const { token } = request.params

      // ── Step 1: Resolve endpoint by token ──────────────────────────────────
      const tokenHash = hashToken(token)
      const endpoint = await findGitHubEndpoint(fastify.prisma, tokenHash)

      if (!endpoint) {
        request.log.warn({ tokenHash }, "No active GitHub endpoint found for token")
        return reply.status(404).send({ received: false })
      }

      // ── Step 2: Extract GitHub headers ─────────────────────────────────────
      const signature = request.headers["x-hub-signature-256"] as string | undefined
      const deliveryId = request.headers["x-github-delivery"] as string | undefined
      const eventType = request.headers["x-github-event"] as string | undefined
      const hookId = request.headers["x-github-hook-id"] as string | undefined

      if (!deliveryId || !eventType) {
        request.log.warn(
          { endpointId: endpoint.id, deliveryId, eventType },
          "Missing GitHub delivery headers"
        )
        return reply.status(400).send({ received: false })
      }

      // ── Step 3: Verify GitHub signature (security gate) ────────────────────
      const rawBody = request.rawBody

      if (endpoint.verificationMode !== "NONE") {
        if (!signature || !rawBody) {
          request.log.warn(
            { endpointId: endpoint.id, deliveryId },
            "Missing x-hub-signature-256 or raw body"
          )
          return reply.status(400).send({ received: false })
        }

        if (!endpoint.signingSecret) {
          request.log.error(
            { endpointId: endpoint.id, deliveryId },
            "Endpoint requires verification but has no signing secret"
          )
          return reply.status(500).send({ received: false })
        }

        const verification = verifyGitHubSignature(rawBody, signature, endpoint.signingSecret)

        if (!verification.valid) {
          request.log.warn(
            { endpointId: endpoint.id, deliveryId, error: verification.error },
            "GitHub signature verification failed"
          )
          await logVerificationFailure(
            fastify,
            endpoint.id,
            deliveryId,
            eventType,
            verification.error ?? "Unknown"
          )
          return reply.status(401).send({ received: false })
        }
      }

      // ── Step 4: Enqueue for background processing (~1ms) ───────────────────
      const event = request.body as GitHubWebhookEvent
      const sourceIp =
        (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
        request.ip

      await fastify.githubQueue.add(deliveryId, {
        endpointId: endpoint.id,
        destinationUrl: endpoint.destinationUrl,
        deliveryId,
        event,
        eventType,
        signature: signature ?? null,
        sourceIp,
        sourceProvider: "GITHUB",
        hookId: hookId ?? null,
        receivedAt: new Date().toISOString(),
        bucket: process.env["S3_BUCKET"] ?? "webhooks",
      })

      return reply.status(202).send({
        received: true,
        deliveryId,
        action: (event as Record<string, unknown>).action as string | undefined,
        repository: (event as Record<string, unknown>).repository?.name as string | undefined,
        queued: true,
      })
    }
  )
}

/**
 * Logs a signature verification failure to the EventLog table.
 * Best-effort — failures here don't block the response.
 */
async function logVerificationFailure(
  fastify: import("fastify").FastifyInstance,
  endpointId: string,
  deliveryId: string,
  eventType: string,
  error: string
): Promise<void> {
  try {
    const tempEvent = await fastify.prisma.webhookEvent.create({
      data: {
        endpointId,
        eventId: `failed_${deliveryId}`,
        source: "GITHUB",
        eventType,
        payloadUrl: "",
        status: "FAILED",
      },
    })

    await fastify.prisma.eventLog.create({
      data: {
        webhookEventId: tempEvent.id,
        status: "ERROR",
        type: LogType.SIGNATURE_VERIFIED,
        message: `GitHub signature verification failed (${deliveryId}): ${error}`,
      },
    })
  } catch (logErr) {
    fastify.log.error({ err: logErr, deliveryId }, "Failed to log GitHub verification failure")
  }
}

export default githubRoute
