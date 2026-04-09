// Generated with: stripe-webhooks skill
// https://github.com/hookdeck/webhook-skills

import type { FastifyPluginAsync } from "fastify"
import { putObject } from "@workspace/s3"
import { DeliveryErrorCode, DeliveryStatus, EventStatus, LogType } from "@workspace/db"
import type Stripe from "stripe"
import { verifyStripeSignature } from "../lib/stripe-verify.js"
import { validateStripePaymentEvent } from "../lib/stripe-payment-validation.js"
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
  delivered?: boolean
  paymentEvent?: boolean
  paymentValid?: boolean | null
  paymentValidationReason?: string
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
      const event = request.body as Stripe.Event
      const paymentValidation = validateStripePaymentEvent(event)

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
            paymentValidation,
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
          paymentEvent: paymentValidation.isPaymentEvent,
          paymentValid: paymentValidation.paymentValid,
          paymentValidationReason: paymentValidation.reason,
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

      const delivered = await forwardToDestination(fastify, {
        webhookEventId: result.webhookEventId,
        endpointId: endpoint.id,
        event,
        destinationUrl: endpoint.destinationUrl,
        signature: signature ?? null,
        paymentValidation,
      })

      request.log.info(
        {
          webhookEventId: result.webhookEventId,
          eventId: event.id,
          eventType: event.type,
          endpointId: endpoint.id,
          destinationUrl: endpoint.destinationUrl,
          delivered,
          key,
        },
        "Stripe webhook ingested"
      )

      return reply.status(200).send({
        received: true,
        eventId: event.id,
        type: event.type,
        delivered,
        paymentEvent: paymentValidation.isPaymentEvent,
        paymentValid: paymentValidation.paymentValid,
        paymentValidationReason: paymentValidation.reason,
      })
    }
  )
}

const ERROR_PREVIEW_LIMIT = 300

function shortError(value: unknown): string {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : "Unknown destination error"
  return message.slice(0, ERROR_PREVIEW_LIMIT)
}

async function forwardToDestination(
  fastify: import("fastify").FastifyInstance,
  params: {
    webhookEventId: string
    endpointId: string
    event: Stripe.Event
    destinationUrl: string
    signature: string | null
    paymentValidation: {
      isPaymentEvent: boolean
      paymentValid: boolean | null
      reason: string
    }
  }
): Promise<boolean> {
  const {
    webhookEventId,
    endpointId,
    event,
    destinationUrl,
    signature,
    paymentValidation,
  } = params

  const delivery = await fastify.prisma.delivery.create({
    data: {
      webhookEventId,
      destinationUrl,
      status: DeliveryStatus.PENDING,
    },
    select: { id: true },
  })

  await fastify.prisma.$transaction([
    fastify.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: EventStatus.PROCESSING,
        version: { increment: 1 },
      },
    }),
    fastify.prisma.eventLog.create({
      data: {
        webhookEventId,
        deliveryId: delivery.id,
        status: "INFO",
        type: LogType.DELIVERY_ATTEMPT,
        message: `Forwarding Stripe event ${event.type} (${event.id}) to destination`,
      },
    }),
  ])

  const startedAt = Date.now()

  try {
    const response = await fetch(destinationUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-source": "stripe",
        "x-webhook-event-id": event.id,
        "x-webhook-event-type": event.type,
        "x-webhook-payment-event": String(paymentValidation.isPaymentEvent),
        "x-webhook-payment-valid":
          paymentValidation.paymentValid === null
            ? "unknown"
            : String(paymentValidation.paymentValid),
        "x-webhook-payment-validation-reason": paymentValidation.reason.slice(
          0,
          ERROR_PREVIEW_LIMIT
        ),
        ...(signature ? { "x-original-stripe-signature": signature } : {}),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000),
    })

    const latencyMs = Date.now() - startedAt
    const responseText = (await response.text()).slice(0, ERROR_PREVIEW_LIMIT)
    const isSuccess = response.ok

    await fastify.prisma.$transaction([
      fastify.prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: isSuccess ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
          responseCode: response.status,
          latencyMs,
          errorCode: isSuccess
            ? null
            : response.status === 429
              ? DeliveryErrorCode.RATE_LIMITED
              : DeliveryErrorCode.PROCESSING_ERROR,
          version: { increment: 1 },
        },
      }),
      fastify.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: isSuccess ? EventStatus.DELIVERED : EventStatus.FAILED,
          lastStatusCode: response.status,
          lastError: isSuccess
            ? null
            : responseText || `Destination responded with ${response.status}`,
          version: { increment: 1 },
        },
      }),
      fastify.prisma.eventLog.create({
        data: {
          webhookEventId,
          deliveryId: delivery.id,
          status: isSuccess ? "SUCCESS" : "ERROR",
          type: isSuccess ? LogType.DELIVERY_SUCCESS : LogType.DELIVERY_FAILED,
          message: isSuccess
            ? `Delivery succeeded with HTTP ${response.status}`
            : `Delivery failed with HTTP ${response.status}`,
        },
      }),
    ])

    return isSuccess
  } catch (err: unknown) {
    const latencyMs = Date.now() - startedAt
    const errorMessage = shortError(err)

    await fastify.prisma.$transaction([
      fastify.prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.FAILED,
          latencyMs,
          errorCode: DeliveryErrorCode.DESTINATION_UNREACHABLE,
          version: { increment: 1 },
        },
      }),
      fastify.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: EventStatus.FAILED,
          lastStatusCode: null,
          lastError: errorMessage,
          version: { increment: 1 },
        },
      }),
      fastify.prisma.eventLog.create({
        data: {
          webhookEventId,
          deliveryId: delivery.id,
          status: "ERROR",
          type: LogType.DELIVERY_FAILED,
          message: `Delivery failed: ${errorMessage}`,
        },
      }),
    ])

    fastify.log.error(
      { webhookEventId, endpointId, destinationUrl, err },
      "Destination forwarding failed"
    )

    return false
  }
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
