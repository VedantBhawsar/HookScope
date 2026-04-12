import type { EventStatus, SourceProvider, DeliveryStatus, LogStatus, LogType } from "@workspace/db"

// ─── Query Types ──────────────────────────────────────────────────────────────

export interface WebhookEventListQuery {
  page: number
  limit: number
  search?: string
  eventType?: string
  projectId?: string
  endpointId?: string
  status?: EventStatus
  source?: SourceProvider
}

export interface DeliveryListQuery {
  page: number
  limit: number
  status?: DeliveryStatus
}

export interface EventLogListQuery {
  page: number
  limit: number
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface WebhookEventDto {
  id: string
  endpointId: string
  eventId: string
  source: SourceProvider
  eventType: string | null
  payloadUrl: string
  status: EventStatus
  sourceIp: string | null
  lastStatusCode: number | null
  lastError: string | null
  createdAt: Date
  endpoint: {
    id: string
    name: string
    project: {
      id: string
      name: string
    }
  }
}

export interface WebhookEventDetailDto extends WebhookEventDto {
  signature: unknown
  version: number
  _count: {
    deliveries: number
    logs: number
  }
}

export interface DeliveryDto {
  id: string
  webhookEventId: string
  destinationUrl: string
  status: DeliveryStatus
  responseCode: number | null
  responseBody: string | null
  latencyMs: number | null
  retryCount: number
  isReplay: boolean
  errorCode: string | null
  nextRetryAt: Date | null
  createdAt: Date
}

export interface EventLogDto {
  id: string
  webhookEventId: string
  deliveryId: string | null
  status: LogStatus
  type: LogType
  message: string
  createdAt: Date
}

export interface PaginatedWebhookEventList {
  data: WebhookEventDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PaginatedDeliveryList {
  data: DeliveryDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PaginatedEventLogList {
  data: EventLogDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
