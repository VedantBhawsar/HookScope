// Generated with: stripe-webhooks skill
// https://github.com/hookdeck/webhook-skills

import type { FastifyPluginAsync } from "fastify"
import { putObject } from "@workspace/s3"
import { verifyStripeSignature } from "../lib/stripe-verify.js"
import {
  hashToken,
  findStripeEndpoint,
  createWebhookEvent,
} from "../services/stripe-ingest.service.js"

interface StripeRouteParams {
  token: string
}

interface StripeIngestResponse {
  received: boolean
  eventId?: string
  type?: string
  duplicate?: boolean
}

const stripeRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /webhooks/stripe/:token
   *
   * Token-based routing: each endpoint has a unique token in the URL.
   * The token is hashed and matched against `Endpoint.tokenHash` in the DB.
   * The endpoint's stored `signingSecret` is used to verify the Stripe signature.
   */
  fastify.post<{ Params: StripeRouteParams; Reply: StripeIngestResponse }>(
    "/webhooks/stripe/:token",
    async (request, reply) => {
      const { token } = request.params

      // ── Step 1: Resolve endpoint by token ──────────────────────────────────
      const tokenHash = hashToken(token)
      const endpoint = await findStripeEndpoint(fastify.prisma, tokenHash)

      if (!endpoint) {
        request.log.warn(
          { tokenHash },
          "No active Stripe endpoint found for token"
        )
        return reply.status(404).send({ received: false })
      }

      // ── Step 2: Verify Stripe signature ────────────────────────────────────
      const rawBody = request.rawBody
      const signature = request.headers["stripe-signature"] as
        | string
        | undefined

      if (endpoint.verificationMode !== "NONE") {
        if (!signature || !rawBody) {
          request.log.warn(
            { endpointId: endpoint.id },
            "Missing stripe-signature header or raw body"
          )
          return reply.status(400).send({ received: false })
        }

        if (!endpoint.signingSecret) {
          request.log.error(
            { endpointId: endpoint.id },
            "Endpoint requires verification but has no signing secret"
          )
          return reply.status(500).send({ received: false })
        }

        const verification = verifyStripeSignature(
          rawBody,
          signature,
          endpoint.signingSecret
        )

        if (!verification.valid) {
          request.log.warn(
            { endpointId: endpoint.id, error: verification.error },
            "Stripe signature verification failed"
          )

          // Log the failed verification attempt
          await logVerificationFailure(
            fastify,
            endpoint.id,
            verification.error ?? "Unknown"
          )

          return reply.status(400).send({ received: false })
        }
      }

      // At this point we have validated the event — parse body as Stripe event
      const event = request.body as {
        id: string
        type: string
        created: number
        livemode: boolean
        api_version: string | null
        data: { object: unknown; previous_attributes?: unknown }
      }

      // ── Step 3: Store raw payload in S3 ────────────────────────────────────
      const receivedAt = new Date().toISOString()
      const bucket = process.env["S3_BUCKET"] ?? "webhooks"
      const key = `events/stripe/${receivedAt.slice(0, 10)}/${event.id}.json`

      await putObject(
        {
          bucket,
          key,
          body: JSON.stringify({
            eventId: event.id,
            eventType: event.type,
            livemode: event.livemode,
            apiVersion: event.api_version,
            receivedAt,
            headers: {
              "stripe-signature": signature,
              "content-type": request.headers["content-type"],
              "user-agent": request.headers["user-agent"],
            },
            data: event.data,
          }),
          contentType: "application/json",
          metadata: {
            source: "stripe",
            "event-type": event.type,
            "event-id": event.id,
          },
        },
        fastify.s3
      )

      const payloadUrl = `s3://${bucket}/${key}`

      // ── Step 4: Persist to database (deduplication built in) ───────────────
      const sourceIp =
        (request.headers["x-forwarded-for"] as string | undefined)
          ?.split(",")[0]
          ?.trim() ?? request.ip

      const result = await createWebhookEvent(fastify.prisma, {
        endpointId: endpoint.id,
        event: {
          id: event.id,
          type: event.type,
        } as import("stripe").Stripe.Event,
        payloadUrl,
        signature: signature ?? null,
        sourceIp,
      })

      if (result.isDuplicate) {
        request.log.info(
          { eventId: event.id, endpointId: endpoint.id },
          "Duplicate Stripe event — already ingested"
        )
        return reply.status(200).send({
          received: true,
          eventId: event.id,
          type: event.type,
          duplicate: true,
        })
      }

      // ── Step 5: Cache in Redis for quick lookups ───────────────────────────
      await fastify.redis.set(
        `event:${result.webhookEventId}`,
        JSON.stringify({
          source: "STRIPE",
          eventType: event.type,
          endpointId: endpoint.id,
          status: "RECEIVED",
        }),
        "EX",
        86400
      )

      request.log.info(
        {
          webhookEventId: result.webhookEventId,
          eventId: event.id,
          eventType: event.type,
          endpointId: endpoint.id,
          key,
        },
        "Stripe webhook ingested"
      )

      return reply.status(200).send({
        received: true,
        eventId: event.id,
        type: event.type,
      })
    }
  )
}

/**
 * Logs a signature verification failure to the EventLog table.
 * This runs as a best-effort operation — failures here don't block the response.
 */
async function logVerificationFailure(
  fastify: import("fastify").FastifyInstance,
  endpointId: string,
  error: string
): Promise<void> {
  try {
    // We don't have a WebhookEvent yet (it failed verification),
    // so we log against a temporary placeholder event for audit purposes.
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
        type: "SIGNATURE_VERIFIED",
        message: `Stripe signature verification failed: ${error}`,
      },
    })
  } catch (logErr) {
    fastify.log.error({ err: logErr }, "Failed to log verification failure")
  }
}

export default stripeRoute
