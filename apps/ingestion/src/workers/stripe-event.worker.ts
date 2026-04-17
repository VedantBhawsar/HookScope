import { Worker } from "bullmq"
import type { ConnectionOptions } from "bullmq"
import type { FastifyBaseLogger } from "fastify"
import type { S3Client } from "@aws-sdk/client-s3"
import { putObject } from "@workspace/s3"
import { DeliveryErrorCode, DeliveryStatus, EventStatus, LogType, prisma } from "@workspace/db"
import type { Redis } from "@workspace/redis"
import { createWebhookEvent } from "../services/stripe-ingest.service.js"
import { STRIPE_EVENT_QUEUE } from "../queues/stripe-event.queue.js"
import type { StripeEventJob } from "../queues/stripe-event.queue.js"
import type Stripe from "stripe"

const ALERT_CHANNEL = "wh:alert:events"

type PrismaClient = typeof prisma

const ERROR_PREVIEW_LIMIT = 300

export interface WorkerDeps {
  prisma: PrismaClient
  s3: S3Client
  redis: Redis
  log: FastifyBaseLogger
}

export function createStripeWorker(connection: ConnectionOptions, deps: WorkerDeps) {
  const worker = new Worker<StripeEventJob>(
    STRIPE_EVENT_QUEUE,
    async (job) => {
      const { endpointId, destinationUrl, event, signature, sourceIp, paymentValidation, receivedAt, bucket } =
        job.data

      // ── Step 1: Store in S3 (idempotent — same key on retry) ──────────────
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
            headers: { "stripe-signature": signature },
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
        deps.s3
      )

      // ── Step 2: Persist to DB (deduplication-safe on retry) ───────────────
      const result = await createWebhookEvent(deps.prisma, {
        endpointId,
        event,
        payloadUrl: `s3://${bucket}/${key}`,
        signature,
        sourceIp,
      })

      // ── Step 3: Cache in Redis (idempotent SET) ───────────────────────────
      if (!result.isDuplicate) {
        await deps.redis.set(
          `event:${result.webhookEventId}`,
          JSON.stringify({ source: "STRIPE", eventType: event.type, endpointId, status: "RECEIVED" }),
          "EX",
          86400
        )
      }

      // ── Resolve userId for alert evaluation (via endpoint → project) ───────
      const endpointWithUser = await deps.prisma.endpoint.findUnique({
        where: { id: endpointId },
        select: { project: { select: { userId: true } } },
      })
      const userId = endpointWithUser?.project.userId ?? null

      // ── Step 4: Forward to destination (throws on failure → BullMQ retries)
      await forwardAndPersist(deps.prisma, deps.log, deps.redis, {
        webhookEventId: result.webhookEventId,
        endpointId,
        userId,
        event,
        destinationUrl,
        signature,
        paymentValidation,
      })
    },
    {
      connection,
      concurrency: 10,
      settings: {
        // Linear backoff: attemptsMade=1→15s, 2→30s, 3→45s, 4→60s, 5→75s
        backoffStrategy: (attemptsMade: number) => attemptsMade * 15_000,
      },
    }
  )

  worker.on("failed", async (job, err) => {
    const maxAttempts = job?.opts.attempts ?? 5
    const isFinal = job != null && job.attemptsMade >= maxAttempts

    deps.log.error(
      { jobId: job?.id, eventId: job?.data.event.id, attempts: job?.attemptsMade, isFinal, err },
      isFinal ? "Stripe event job exhausted all retries" : "Stripe event job failed (will retry)"
    )

    if (!isFinal || !job) return

    // Transition event to DEAD_LETTER after all retries are exhausted
    try {
      const { endpointId, event } = job.data
      const we = await deps.prisma.webhookEvent.findFirst({
        where: { endpointId, eventId: event.id },
        select: { id: true },
      })
      if (!we) return

      await deps.prisma.$transaction([
        deps.prisma.webhookEvent.update({
          where: { id: we.id },
          data: { status: EventStatus.DEAD_LETTER, version: { increment: 1 } },
        }),
        deps.prisma.eventLog.create({
          data: {
            webhookEventId: we.id,
            status: "ERROR",
            type: LogType.DELIVERY_FAILED,
            message: `All ${maxAttempts} delivery attempts exhausted — event moved to dead letter queue`,
          },
        }),
      ])

      const endpointRow = await deps.prisma.endpoint.findUnique({
        where: { id: endpointId },
        select: { project: { select: { userId: true } } },
      })
      await publishAlertEvent(deps.redis, {
        endpointId,
        userId: endpointRow?.project.userId ?? null,
        deliveryStatus: DeliveryStatus.FAILED,
        errorCode: null,
        eventStatus: EventStatus.DEAD_LETTER,
      })
    } catch (deadLetterErr) {
      deps.log.error({ err: deadLetterErr }, "Failed to transition event to DEAD_LETTER")
    }
  })

  worker.on("completed", (job) => {
    deps.log.info(
      { jobId: job.id, eventId: job.data.event.id },
      "Stripe event job completed"
    )
  })

  return worker
}

async function publishAlertEvent(
  redis: Redis,
  payload: {
    endpointId: string
    userId: string | null
    deliveryStatus: string
    errorCode: string | null
    eventStatus: string
  }
): Promise<void> {
  if (!payload.userId) return
  try {
    await redis.publish(
      ALERT_CHANNEL,
      JSON.stringify({ ...payload, timestamp: new Date().toISOString() })
    )
  } catch (err) {
    // Non-fatal — alert publish failure must never break delivery
    console.error("[StripeWorker] Failed to publish alert event:", err)
  }
}

async function forwardAndPersist(
  db: PrismaClient,
  log: FastifyBaseLogger,
  redis: Redis,
  params: {
    webhookEventId: string
    endpointId: string
    userId: string | null
    event: Stripe.Event
    destinationUrl: string
    signature: string | null
    paymentValidation: StripeEventJob["paymentValidation"]
  }
): Promise<void> {
  const { webhookEventId, endpointId, userId, event, destinationUrl, signature, paymentValidation } = params

  const delivery = await db.delivery.create({
    data: { webhookEventId, destinationUrl, status: DeliveryStatus.PENDING },
    select: { id: true },
  })

  await db.$transaction([
    db.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: EventStatus.PROCESSING, version: { increment: 1 } },
    }),
    db.eventLog.create({
      data: {
        webhookEventId,
        deliveryId: delivery.id,
        status: "INFO",
        type: LogType.DELIVERY_ATTEMPT,
        message: `Forwarding Stripe event ${event.type} (${event.id}) to ${destinationUrl}`,
      },
    }),
  ])

  const startedAt = Date.now()
  let fetchResponse: Response | undefined

  // ── Network call (isolated so timeout/abort errors hit the catch below) ──
  try {
    fetchResponse = await fetch(destinationUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-source": "stripe",
        "x-webhook-event-id": event.id,
        "x-webhook-event-type": event.type,
        "x-webhook-payment-event": String(paymentValidation.isPaymentEvent),
        "x-webhook-payment-valid":
          paymentValidation.paymentValid === null ? "unknown" : String(paymentValidation.paymentValid),
        "x-webhook-payment-validation-reason": paymentValidation.reason.slice(0, ERROR_PREVIEW_LIMIT),
        ...(signature ? { "x-original-stripe-signature": signature } : {}),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (networkErr: unknown) {
    // Timeout, DNS failure, connection refused — persist then throw for retry
    const latencyMs = Date.now() - startedAt
    const errorMessage =
      networkErr instanceof Error ? networkErr.message.slice(0, ERROR_PREVIEW_LIMIT) : "Network error"

    await db.$transaction([
      db.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.FAILED,
          latencyMs,
          errorCode: DeliveryErrorCode.DESTINATION_UNREACHABLE,
          version: { increment: 1 },
        },
      }),
      db.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: EventStatus.FAILED, lastError: errorMessage, version: { increment: 1 } },
      }),
      db.eventLog.create({
        data: {
          webhookEventId,
          deliveryId: delivery.id,
          status: "ERROR",
          type: LogType.DELIVERY_FAILED,
          message: `Delivery failed (network): ${errorMessage}`,
        },
      }),
    ])

    log.warn({ webhookEventId, endpointId, destinationUrl, err: networkErr }, "Delivery network error")
    await publishAlertEvent(redis, {
      endpointId,
      userId,
      deliveryStatus: DeliveryStatus.FAILED,
      errorCode: DeliveryErrorCode.DESTINATION_UNREACHABLE,
      eventStatus: EventStatus.FAILED,
    })
    throw networkErr
  }

  // ── HTTP response received — persist result ──────────────────────────────
  const latencyMs = Date.now() - startedAt
  const isSuccess = fetchResponse.ok
  const responseText = (await fetchResponse.text()).slice(0, ERROR_PREVIEW_LIMIT)

  await db.$transaction([
    db.delivery.update({
      where: { id: delivery.id },
      data: {
        status: isSuccess ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        responseCode: fetchResponse.status,
        responseBody: responseText || null,
        latencyMs,
        errorCode: isSuccess
          ? null
          : fetchResponse.status === 429
            ? DeliveryErrorCode.RATE_LIMITED
            : DeliveryErrorCode.PROCESSING_ERROR,
        version: { increment: 1 },
      },
    }),
    db.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: isSuccess ? EventStatus.DELIVERED : EventStatus.FAILED,
        lastStatusCode: fetchResponse.status,
        lastError: isSuccess ? null : responseText || `Destination responded with ${fetchResponse.status}`,
        version: { increment: 1 },
      },
    }),
    db.eventLog.create({
      data: {
        webhookEventId,
        deliveryId: delivery.id,
        status: isSuccess ? "SUCCESS" : "ERROR",
        type: isSuccess ? LogType.DELIVERY_SUCCESS : LogType.DELIVERY_FAILED,
        message: isSuccess
          ? `Delivery succeeded with HTTP ${fetchResponse.status}`
          : `Delivery failed with HTTP ${fetchResponse.status}`,
      },
    }),
  ])

  // Publish alert event after terminal delivery state
  const errorCode = isSuccess
    ? null
    : fetchResponse.status === 429
      ? DeliveryErrorCode.RATE_LIMITED
      : DeliveryErrorCode.PROCESSING_ERROR
  await publishAlertEvent(redis, {
    endpointId,
    userId,
    deliveryStatus: isSuccess ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
    errorCode,
    eventStatus: isSuccess ? EventStatus.DELIVERED : EventStatus.FAILED,
  })

  if (!isSuccess) {
    // Throw AFTER persisting — BullMQ retries, DB has the audit trail
    throw new Error(`Destination returned HTTP ${fetchResponse.status}: ${responseText}`)
  }
}
