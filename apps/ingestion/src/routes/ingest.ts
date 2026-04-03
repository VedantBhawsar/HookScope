import type { FastifyPluginAsync } from "fastify"
import { randomUUID } from "node:crypto"
import { putObject } from "@workspace/s3"
import type { WebhookPayload, IngestResponse } from "../types/index.js"

const INGEST_BODY_SCHEMA = {
  type: "object",
  required: ["source", "payload"],
  properties: {
    source: { type: "string", minLength: 1, maxLength: 100 },
    payload: {},
    headers: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
} as const

const INGEST_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    status: { type: "string" },
    receivedAt: { type: "string" },
  },
} as const

const ingestRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: Omit<WebhookPayload, "receivedAt"> }>(
    "/ingest",
    {
      schema: {
        body: INGEST_BODY_SCHEMA,
        response: {
          202: INGEST_RESPONSE_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      const id = randomUUID()
      const receivedAt = new Date().toISOString()

      const event: WebhookPayload = {
        ...request.body,
        receivedAt,
      }

      // Persist raw event to S3
      const bucket = process.env["S3_BUCKET"] ?? "webhooks"
      const key = `events/${event.source}/${receivedAt.slice(0, 10)}/${id}.json`

      await putObject(
        {
          bucket,
          key,
          body: JSON.stringify(event),
          contentType: "application/json",
          metadata: { source: event.source, id },
        },
        fastify.s3
      )

      // Cache event ID in Redis for deduplication / quick lookup
      await fastify.redis.set(`event:${id}`, "1", "EX", 86400)

      request.log.info({ id, source: event.source, key }, "Webhook ingested")

      const response: IngestResponse = { id, status: "accepted", receivedAt }
      return reply.status(202).send(response)
    }
  )
}

export default ingestRoute
