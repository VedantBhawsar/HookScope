import type { SourceProvider, VerificationMode, DeliveryStatus, DeliveryErrorCode } from "@workspace/db"

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateEndpointDto {
  name: string
  source: SourceProvider
  destinationUrl: string
  verificationMode?: VerificationMode
  signingSecret?: string
  signatureHeader?: string
  signatureType?: string
  timestampHeader?: string
  toleranceSec?: number
  eventFilters?: unknown
  status?: string
}

export interface UpdateEndpointDto {
  name?: string
  destinationUrl?: string
  verificationMode?: VerificationMode
  signingSecret?: string
  signatureHeader?: string
  signatureType?: string
  timestampHeader?: string
  toleranceSec?: number
  eventFilters?: unknown
  status?: string
}

// ─── Query Types ──────────────────────────────────────────────────────────────

export interface EndpointListQuery {
  page: number
  limit: number
  search?: string
  source?: SourceProvider
  status?: string
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface EndpointDto {
  id: string
  projectId: string
  name: string
  source: SourceProvider
  destinationUrl: string
  verificationMode: VerificationMode
  signatureHeader: string | null
  signatureType: string | null
  timestampHeader: string | null
  toleranceSec: number | null
  eventFilters: unknown
  status: string
  createdAt: Date
}

/** Returned only on creation — the raw token is shown once and never stored. */
export interface EndpointCreatedDto extends EndpointDto {
  token: string
  /** Fully qualified ingestion URL to configure in your provider's webhook settings. */
  webhookUrl: string
}

export interface PaginatedEndpointList {
  data: EndpointDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ─── Overview DTOs ────────────────────────────────────────────────────────────

export interface EndpointStatsDto {
  totalEvents: number
  statusBreakdown: Record<string, number>
  successRate: number
  failureRate: number
}

export interface VolumeDataPoint {
  /** ISO-8601 string for the start of the hour or day bucket */
  hour: string
  delivered: number
  failed: number
  other: number
}

export interface EndpointVolumeDto {
  data: VolumeDataPoint[]
  windowHours: number
  /** 'hour' when windowHours ≤ 72, 'day' when > 72 */
  granularity: 'hour' | 'day'
}

export interface DeliveryStatsDto {
  totalDeliveries: number
  latency: {
    avg: number | null
    min: number | null
    max: number | null
  }
  statusBreakdown: Record<string, number>
  errorCodeBreakdown: Record<string, number>
  eventTypeBreakdown: { eventType: string; count: number }[]
}

// ─── Delivery List DTOs ───────────────────────────────────────────────────────

export interface EndpointDeliveryListQuery {
  page: number
  limit: number
  status?: DeliveryStatus
  errorCode?: DeliveryErrorCode
  search?: string
}

export interface EndpointDeliveryDto {
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
  event: {
    eventId: string
    eventType: string | null
    source: SourceProvider
  }
}

export interface PaginatedEndpointDeliveryList {
  data: EndpointDeliveryDto[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
