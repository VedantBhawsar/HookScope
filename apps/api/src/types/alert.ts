import { z } from "zod"
import { AlertSeverity, AlertType, DeliveryErrorCode, EventStatus } from "@hookscope/db"

// ─── Config Schemas (per type) ────────────────────────────────────────────────

export const deliveryFailureRateConfigSchema = z.object({
  threshold: z.number().min(1).max(100),
  windowMinutes: z.number().min(1).max(1440),
})

export const deliveryErrorCodeConfigSchema = z.object({
  errorCode: z.nativeEnum(DeliveryErrorCode),
})

export const eventFailedConfigSchema = z.object({
  statuses: z
    .array(z.nativeEnum(EventStatus))
    .min(1)
    .refine((s) => s.every((v) => v === EventStatus.FAILED || v === EventStatus.DEAD_LETTER), {
      message: "Only FAILED and DEAD_LETTER statuses are supported",
    }),
})

export const endpointSilenceConfigSchema = z.object({
  windowMinutes: z.number().min(1).max(1440),
})

export const alertConfigByType = {
  [AlertType.DELIVERY_FAILURE_RATE]: deliveryFailureRateConfigSchema,
  [AlertType.DELIVERY_ERROR_CODE]: deliveryErrorCodeConfigSchema,
  [AlertType.EVENT_FAILED]: eventFailedConfigSchema,
  [AlertType.ENDPOINT_SILENCE]: endpointSilenceConfigSchema,
} as const

// ─── Config Union Type ────────────────────────────────────────────────────────

export type DeliveryFailureRateConfig = z.infer<typeof deliveryFailureRateConfigSchema>
export type DeliveryErrorCodeConfig = z.infer<typeof deliveryErrorCodeConfigSchema>
export type EventFailedConfig = z.infer<typeof eventFailedConfigSchema>
export type EndpointSilenceConfig = z.infer<typeof endpointSilenceConfigSchema>

export type AlertConfig =
  | DeliveryFailureRateConfig
  | DeliveryErrorCodeConfig
  | EventFailedConfig
  | EndpointSilenceConfig

// ─── Create / Update DTOs ─────────────────────────────────────────────────────

const alertBaseSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(AlertType),
  severity: z.nativeEnum(AlertSeverity).default(AlertSeverity.WARNING),
  endpointId: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
})

export const createAlertSchema = alertBaseSchema.superRefine((data, ctx) => {
  const configSchema = alertConfigByType[data.type]
  if (!configSchema) return
  const result = configSchema.safeParse(data.config)
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error.issues.map((i) => i.message).join(", "),
      path: ["config"],
    })
  }
})

// Partial base (no refinements) — config validation done at service level for updates
export const updateAlertSchema = alertBaseSchema.partial()

export type CreateAlertDto = z.infer<typeof createAlertSchema>
export type UpdateAlertDto = z.infer<typeof updateAlertSchema>

// ─── Query Types ──────────────────────────────────────────────────────────────

export interface AlertListQuery {
  page: number
  limit: number
  search?: string
}

// ─── SSE Event Payload ────────────────────────────────────────────────────────

export interface AlertTriggeredEvent {
  triggerId: string
  alertId: string
  alertName: string
  severity: AlertSeverity
  message: string
  endpointId?: string | null
  triggeredAt: string
}

// ─── Redis Pub/Sub Payload ────────────────────────────────────────────────────

export interface AlertEventPayload {
  endpointId: string
  userId: string
  deliveryStatus: string
  errorCode: string | null
  eventStatus: string
  timestamp: string
}
