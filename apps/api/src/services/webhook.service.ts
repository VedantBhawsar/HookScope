import { getObject, getS3Client } from "@workspace/s3"
import { DeliveryStatus, DeliveryErrorCode, EventStatus } from "@workspace/db"
import type { WebhookRepository } from "../repositories/webhook.repository"
import type {
  WebhookEventListQuery,
  DeliveryListQuery,
  EventLogListQuery,
  PaginatedWebhookEventList,
  PaginatedDeliveryList,
  PaginatedEventLogList,
} from "../types/webhook"

export class WebhookService {
  constructor(private readonly repository: WebhookRepository) {}

  async listByUser(userId: string, query: WebhookEventListQuery): Promise<PaginatedWebhookEventList> {
    const { total, data } = await this.repository.findAllByUserId(userId, query)
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }

  getById(id: string, userId: string) {
    return this.repository.findByIdAndUserId(id, userId)
  }

  async listDeliveries(eventId: string, userId: string, query: DeliveryListQuery): Promise<PaginatedDeliveryList> {
    const { total, data } = await this.repository.findDeliveriesByEventId(eventId, userId, query)
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }

  async listLogs(eventId: string, userId: string, query: EventLogListQuery): Promise<PaginatedEventLogList> {
    const { total, data } = await this.repository.findLogsByEventId(eventId, userId, query)
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }

  async retry(eventId: string, userId: string) {
    const delivery = await this.repository.createRetryDelivery(eventId, userId)
    if (!delivery) return null

    const event = await this.repository.getEventForReplay(eventId, userId)
    if (event) {
      // Fire async — caller gets PENDING status immediately, execution updates DB in background
      this.executeReplayDelivery(delivery.id, delivery.webhookEventId, delivery.destinationUrl, event).catch(
        async (err) => {
          console.error("[WebhookService.retry] Unexpected replay error:", err)
          await this.repository
            .updateDeliveryOutcome(delivery.id, delivery.webhookEventId, {
              deliveryStatus: DeliveryStatus.FAILED,
              eventStatus: EventStatus.FAILED,
              errorCode: DeliveryErrorCode.PROCESSING_ERROR,
              logStatus: "ERROR",
              logMessage: `Replay failed: ${err instanceof Error ? err.message.slice(0, 200) : "Unknown error"}`,
            })
            .catch(() => {})
        }
      )
    }

    return delivery
  }

  async batchReplay(eventIds: string[], userId: string) {
    const events = await this.repository.findEventsByIdsAndUserId(eventIds, userId)
    let successCount = 0

    // Fire all replays async (don't wait for completion)
    for (const event of events) {
      const delivery = await this.repository.createRetryDelivery(event.id, userId)
      if (delivery && event) {
        successCount++
        this.executeReplayDelivery(delivery.id, delivery.webhookEventId, delivery.destinationUrl, event).catch(
          async (err) => {
            console.error("[WebhookService.batchReplay] Replay error:", err)
            await this.repository
              .updateDeliveryOutcome(delivery.id, delivery.webhookEventId, {
                deliveryStatus: DeliveryStatus.FAILED,
                eventStatus: EventStatus.FAILED,
                errorCode: DeliveryErrorCode.PROCESSING_ERROR,
                logStatus: "ERROR",
                logMessage: `Batch replay failed: ${err instanceof Error ? err.message.slice(0, 200) : "Unknown error"}`,
              })
              .catch(() => {})
          }
        )
      }
    }

    return { successCount, totalRequested: eventIds.length, skippedCount: eventIds.length - successCount }
  }

  async batchDelete(eventIds: string[], userId: string) {
    const deletedCount = await this.repository.batchSoftDeleteEvents(eventIds, userId)
    return { deletedCount, totalRequested: eventIds.length }
  }

  private async executeReplayDelivery(
    deliveryId: string,
    webhookEventId: string,
    destinationUrl: string,
    event: { eventType: string | null; source: string; payloadUrl: string }
  ): Promise<void> {
    // Parse s3://bucket/key
    const withoutScheme = event.payloadUrl.replace(/^s3:\/\//, "")
    const slashIdx = withoutScheme.indexOf("/")
    const bucket = withoutScheme.slice(0, slashIdx)
    const key = withoutScheme.slice(slashIdx + 1)

    let payloadBytes: Uint8Array
    try {
      payloadBytes = await getObject({ bucket, key }, getS3Client())
    } catch {
      await this.repository.updateDeliveryOutcome(deliveryId, webhookEventId, {
        deliveryStatus: DeliveryStatus.FAILED,
        eventStatus: EventStatus.FAILED,
        errorCode: DeliveryErrorCode.PROCESSING_ERROR,
        logStatus: "ERROR",
        logMessage: "Replay failed: could not fetch original payload from S3",
      })
      return
    }

    const startedAt = Date.now()
    try {
      const response = await fetch(destinationUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-source": event.source.toLowerCase(),
          "x-webhook-event-type": event.eventType ?? "",
          "x-webhook-replay": "true",
        },
        body: payloadBytes,
        signal: AbortSignal.timeout(10_000),
      })

      const latencyMs = Date.now() - startedAt
      const responseText = (await response.text()).slice(0, 300)
      const isSuccess = response.ok

      await this.repository.updateDeliveryOutcome(deliveryId, webhookEventId, {
        deliveryStatus: isSuccess ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        eventStatus: isSuccess ? EventStatus.DELIVERED : EventStatus.FAILED,
        responseCode: response.status,
        responseBody: responseText || undefined,
        latencyMs,
        errorCode: isSuccess ? null : DeliveryErrorCode.PROCESSING_ERROR,
        logStatus: isSuccess ? "SUCCESS" : "ERROR",
        logMessage: isSuccess
          ? `Replay delivery succeeded with HTTP ${response.status}`
          : `Replay delivery failed with HTTP ${response.status}`,
      })
    } catch (err) {
      const latencyMs = Date.now() - startedAt
      const msg = err instanceof Error ? err.message.slice(0, 200) : "Network error"
      await this.repository.updateDeliveryOutcome(deliveryId, webhookEventId, {
        deliveryStatus: DeliveryStatus.FAILED,
        eventStatus: EventStatus.FAILED,
        latencyMs,
        errorCode: DeliveryErrorCode.DESTINATION_UNREACHABLE,
        logStatus: "ERROR",
        logMessage: `Replay delivery failed (network): ${msg}`,
      })
    }
  }
}
