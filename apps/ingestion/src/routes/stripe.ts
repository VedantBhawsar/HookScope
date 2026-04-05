import type { FastifyPluginAsync } from "fastify"
import type {
  StripeWebhookEvent,
  StripeIngestResponse,
} from "../types/stripe.js"
import { appendLog } from "../lib/file-logger.js"
import { putObject } from "@workspace/s3"

const STRIPE_BODY_SCHEMA = {
  type: "object",
  required: ["id", "object", "type", "created", "livemode", "data"],
  properties: {
    id: { type: "string" },
    object: { type: "string", enum: ["event"] },
    type: { type: "string" },
    created: { type: "number" },
    livemode: { type: "boolean" },
    api_version: { type: ["string", "null"] },
    data: {
      type: "object",
      required: ["object"],
      properties: {
        object: {},
        previous_attributes: {},
      },
    },
  },
} as const

const STRIPE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    received: { type: "boolean" },
    id: { type: "string" },
    type: { type: "string" },
  },
} as const

const stripeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: StripeWebhookEvent; Reply: StripeIngestResponse }>(
    "/webhooks/stripe",
    {
      schema: {
        body: STRIPE_BODY_SCHEMA,
        response: {
          200: STRIPE_RESPONSE_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      const event = request.body
      const receivedAt = new Date().toISOString()

      // Capture headers that matter for observability / downstream verification
      const headers: Record<string, string | undefined> = {
        "stripe-signature": request.headers["stripe-signature"] as
          | string
          | undefined,
        "content-type": request.headers["content-type"],
        "user-agent": request.headers["user-agent"],
        "x-forwarded-for": request.headers["x-forwarded-for"] as
          | string
          | undefined,
      }

      const record = {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
        apiVersion: event.api_version,
        receivedAt,
        headers,
        data: event.data,
      }

      // Persist to S3 — headers + payload together so nothing is lost
      const bucket = process.env["S3_BUCKET"] ?? "webhooks"
      const key = `events/stripe/${receivedAt.slice(0, 10)}/${event.id}.json`

      await putObject(
        {
          bucket,
          key,
          body: JSON.stringify(record),
          contentType: "application/json",
          metadata: {
            source: "stripe",
            "event-type": event.type,
            "event-id": event.id,
          },
        },
        fastify.s3
      )

      // Log to file (non-blocking, fire-and-forget)
      void appendLog({
        timestamp: receivedAt,
        source: "stripe",
        eventType: event.type,
        eventId: event.id,
        headers,
        data: event.data.object,
      })

      request.log.info(
        {
          eventId: event.id,
          eventType: event.type,
          livemode: event.livemode,
          key,
        },
        "Stripe webhook stored"
      )

      return reply.status(200).send({
        received: true,
        id: event.id,
        type: event.type,
      })
    }
  )
}

export default stripeRoute
