import type { SourceProvider, VerificationMode } from "@workspace/db"

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
