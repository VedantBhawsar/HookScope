import { prisma } from "@hookscope/db/client"
import { AlertType } from "@hookscope/db"
import { createRedisClient } from "@hookscope/redis/client"
import { AlertRepository } from "../alerts/alert.repository"
import { sseManager } from "./sse-manager"
import type { AlertConfig, AlertEventPayload, AlertTriggeredEvent } from "../types/alert"
import type {
  DeliveryErrorCodeConfig,
  DeliveryFailureRateConfig,
  EndpointSilenceConfig,
  EventFailedConfig,
} from "../types/alert"

const ALERT_CHANNEL = "wh:alert:events"
const SILENCE_CHECK_INTERVAL_MS = 5 * 60 * 1_000 // 5 minutes

const repository = new AlertRepository()

async function evaluateAlerts(payload: AlertEventPayload): Promise<void> {
  const alerts = await repository.findActiveAlertsByUserId(payload.userId)

  for (const alert of alerts) {
    // Skip alerts scoped to a different endpoint
    if (alert.endpointId && alert.endpointId !== payload.endpointId) continue

    const config = alert.config as AlertConfig
    let triggered = false
    let message = ""
    let metadata: Record<string, unknown> = {}

    try {
      switch (alert.type) {
        case AlertType.DELIVERY_ERROR_CODE: {
          const cfg = config as DeliveryErrorCodeConfig
          if (payload.errorCode === cfg.errorCode) {
            triggered = true
            message = `Delivery error ${cfg.errorCode} detected on endpoint ${payload.endpointId}`
            metadata = { errorCode: payload.errorCode, endpointId: payload.endpointId }
          }
          break
        }

        case AlertType.EVENT_FAILED: {
          const cfg = config as EventFailedConfig
          if (cfg.statuses.includes(payload.eventStatus as never)) {
            triggered = true
            message = `Event reached status ${payload.eventStatus} on endpoint ${payload.endpointId}`
            metadata = { eventStatus: payload.eventStatus, endpointId: payload.endpointId }
          }
          break
        }

        case AlertType.DELIVERY_FAILURE_RATE: {
          const cfg = config as DeliveryFailureRateConfig
          const since = new Date(Date.now() - cfg.windowMinutes * 60 * 1_000)
          const [total, failed] = await Promise.all([
            prisma.delivery.count({
              where: {
                createdAt: { gte: since },
                webhookEvent: { endpointId: payload.endpointId },
              },
            }),
            prisma.delivery.count({
              where: {
                createdAt: { gte: since },
                status: "FAILED",
                webhookEvent: { endpointId: payload.endpointId },
              },
            }),
          ])
          if (total > 0) {
            const rate = (failed / total) * 100
            if (rate >= cfg.threshold) {
              triggered = true
              message = `Delivery failure rate ${rate.toFixed(1)}% exceeds threshold ${cfg.threshold}% in last ${cfg.windowMinutes}min`
              metadata = { failureRate: rate, threshold: cfg.threshold, windowMinutes: cfg.windowMinutes, endpointId: payload.endpointId }
            }
          }
          break
        }

        // ENDPOINT_SILENCE is checked by the periodic job below
        default:
          break
      }
    } catch (err) {
      console.error(`[AlertEvaluator] Error evaluating alert ${alert.id}:`, err)
      continue
    }

    if (triggered) {
      try {
        const trigger = await repository.createTrigger(alert.id, message, metadata)
        const event: AlertTriggeredEvent = {
          triggerId: trigger.id,
          alertId: alert.id,
          alertName: alert.name,
          severity: alert.severity,
          message,
          endpointId: alert.endpointId,
          triggeredAt: trigger.createdAt.toISOString(),
        }
        sseManager.send(payload.userId, "alert_triggered", event)
      } catch (err) {
        console.error(`[AlertEvaluator] Failed to save trigger for alert ${alert.id}:`, err)
      }
    }
  }
}

async function checkEndpointSilence(): Promise<void> {
  const silenceAlerts = await prisma.alert.findMany({
    where: { isActive: true, type: AlertType.ENDPOINT_SILENCE },
    select: { id: true, name: true, severity: true, config: true, endpointId: true, userId: true },
  })

  for (const alert of silenceAlerts) {
    const cfg = alert.config as EndpointSilenceConfig
    const since = new Date(Date.now() - cfg.windowMinutes * 60 * 1_000)

    try {
      const where = {
        createdAt: { gte: since },
        ...(alert.endpointId ? { endpointId: alert.endpointId } : { endpoint: { project: { userId: alert.userId } } }),
      }

      const count = await prisma.webhookEvent.count({ where })

      if (count === 0) {
        const message = alert.endpointId
          ? `No events received on endpoint ${alert.endpointId} in the last ${cfg.windowMinutes} minutes`
          : `No events received on any endpoint in the last ${cfg.windowMinutes} minutes`

        const metadata: Record<string, unknown> = { windowMinutes: cfg.windowMinutes }
        if (alert.endpointId) metadata.endpointId = alert.endpointId

        const trigger = await repository.createTrigger(alert.id, message, metadata)
        const event: AlertTriggeredEvent = {
          triggerId: trigger.id,
          alertId: alert.id,
          alertName: alert.name,
          severity: alert.severity,
          message,
          endpointId: alert.endpointId,
          triggeredAt: trigger.createdAt.toISOString(),
        }
        sseManager.send(alert.userId, "alert_triggered", event)
      }
    } catch (err) {
      console.error(`[AlertEvaluator] Silence check failed for alert ${alert.id}:`, err)
    }
  }
}

export function initAlertEvaluator(): void {
  // Dedicated subscriber connection — must not be shared with BullMQ or commands
  const subscriber = createRedisClient()

  subscriber.subscribe(ALERT_CHANNEL, (err) => {
    if (err) {
      console.error("[AlertEvaluator] Failed to subscribe to Redis channel:", err)
      return
    }
    console.log(`[AlertEvaluator] Subscribed to Redis channel: ${ALERT_CHANNEL}`)
  })

  subscriber.on("message", (_channel, rawMessage) => {
    let payload: AlertEventPayload
    try {
      payload = JSON.parse(rawMessage) as AlertEventPayload
    } catch {
      console.error("[AlertEvaluator] Invalid message on alert channel:", rawMessage)
      return
    }
    // Fire-and-forget — errors logged inside evaluateAlerts
    void evaluateAlerts(payload)
  })

  // Periodic silence check
  setInterval(() => {
    void checkEndpointSilence()
  }, SILENCE_CHECK_INTERVAL_MS)

  console.log("[AlertEvaluator] Initialized (silence check every 5 min)")
}
