import type { FastifyPluginAsync } from "fastify"
import { LogType } from "@workspace/db"
import type Stripe from "stripe"
import { verifyStripeSignature } from "../lib/stripe-verify.js"
import { validateStripePaymentEvent } from "../lib/stripe-payment-validation.js"
import { hashToken, findStripeEndpoint } from "../services/stripe-ingest.service.js"

interface StripeRouteParams {
  token: string
}

interface StripeIngestResponse {
  received: boolean
  eventId?: string
  type?: string
  queued?: boolean
}

const stripeRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /webhooks/stripe/:token
   *
   * Hot path — only does two things before responding:
   *   1. Token lookup + signature verification (security gate, must be sync)
   *   2. Enqueue job to Redis (BullMQ) — ~1ms
   *
   * All persistence (S3, DB, Redis cache, forwarding) runs in the background worker.
   */
  fastify.post<{ Params: StripeRouteParams; Reply: StripeIngestResponse }>(
    "/webhooks/stripe/:token",
    async (request, reply) => {
      const { token } = request.params

      // ── Step 1: Resolve endpoint by token ──────────────────────────────────
      const tokenHash = hashToken(token)
      const endpoint = await findStripeEndpoint(fastify.prisma, tokenHash)

      if (!endpoint) {
        request.log.warn({ tokenHash }, "No active Stripe endpoint found for token")
        return reply.status(404).send({ received: false })
      }

      // ── Step 2: Verify Stripe signature (security gate) ────────────────────
      const rawBody = request.rawBody
      const signature = request.headers["stripe-signature"] as string | undefined

      if (endpoint.verificationMode !== "NONE") {
        if (!signature || !rawBody) {
          request.log.warn({ endpointId: endpoint.id }, "Missing stripe-signature or raw body")
          return reply.status(400).send({ received: false })
        }

        if (!endpoint.signingSecret) {
          request.log.error({ endpointId: endpoint.id }, "Endpoint requires verification but has no signing secret")
          return reply.status(500).send({ received: false })
        }

        const verification = verifyStripeSignature(rawBody, signature, endpoint.signingSecret)

        if (!verification.valid) {
          request.log.warn(
            { endpointId: endpoint.id, error: verification.error },
            "Stripe signature verification failed"
          )
          await logVerificationFailure(fastify, endpoint.id, verification.error ?? "Unknown")
          return reply.status(400).send({ received: false })
        }
      }

      // ── Step 3: Enqueue for background processing (~1ms) ───────────────────
      const event = request.body as Stripe.Event
      const paymentValidation = validateStripePaymentEvent(event)

      await fastify.stripeQueue.add(event.id, {
        endpointId: endpoint.id,
        destinationUrl: endpoint.destinationUrl,
        event,
        signature: signature ?? null,
        sourceIp:
          (request.headers["x-forwarded-for"] as string | undefined)
            ?.split(",")[0]
            ?.trim() ?? request.ip,
        paymentValidation,
        receivedAt: new Date().toISOString(),
        bucket: process.env["S3_BUCKET"] ?? "webhooks",
      })

      return reply.status(200).send({
        received: true,
        eventId: event.id,
        type: event.type,
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
  error: string
): Promise<void> {
  try {
    const tempEvent = await fastify.prisma.webhookEvent.create({
      data: {
        endpointId,
        eventId: `failed_${Date.now()}`,
        source: "STRIPE",
        payloadUrl: "",
        status: "FAILED",
      },
    })

    await fastify.prisma.eventLog.create({
      data: {
        webhookEventId: tempEvent.id,
        status: "ERROR",
        type: LogType.SIGNATURE_VERIFIED,
        message: `Stripe signature verification failed: ${error}`,
      },
    })
  } catch (logErr) {
    fastify.log.error({ err: logErr }, "Failed to log verification failure")
  }
}

export default stripeRoute
