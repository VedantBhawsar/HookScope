"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"
import type { EventStatus, DeliveryStatus, SourceProvider } from "@workspace/db"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebhookEventRecord {
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
  createdAt: string
  endpoint: {
    id: string
    name: string
    project: { id: string; name: string }
  }
}

export interface WebhookEventDetail extends WebhookEventRecord {
  signature: unknown
  version: number
  _count: { deliveries: number; logs: number }
}

export interface DeliveryRecord {
  id: string
  webhookEventId: string
  destinationUrl: string
  status: DeliveryStatus
  responseCode: number | null
  responseBodyUrl: string | null
  latencyMs: number | null
  retryCount: number
  isReplay: boolean
  errorCode: string | null
  nextRetryAt: string | null
  createdAt: string
}

export interface EventLogRecord {
  id: string
  webhookEventId: string
  deliveryId: string | null
  status: string
  type: string
  message: string
  createdAt: string
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const webhookQueryKeys = {
  all: ["webhooks"] as const,
  lists: () => ["webhooks", "list"] as const,
  list: (params: WebhookEventsQueryInput) => ["webhooks", "list", params] as const,
  detail: (id: string) => ["webhooks", "detail", id] as const,
  deliveries: (eventId: string, params: DeliveryQueryInput) =>
    ["webhooks", "deliveries", eventId, params] as const,
  logs: (eventId: string, params: LogQueryInput) =>
    ["webhooks", "logs", eventId, params] as const,
}

// ─── Query Inputs ─────────────────────────────────────────────────────────────

export interface WebhookEventsQueryInput {
  endpointId?: string | null
  projectId?: string | null
  page?: number
  limit?: number
  status?: EventStatus | ""
  eventType?: string
  search?: string
}

export interface DeliveryQueryInput {
  page?: number
  limit?: number
  status?: DeliveryStatus | ""
}

export interface LogQueryInput {
  page?: number
  limit?: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Paginated webhook events list. Server-side pagination — limit to 20 per page
 * to stay performant at 100k+ events per endpoint.
 */
export function useWebhookEventsQuery(input: WebhookEventsQueryInput) {
  const params = {
    endpointId: input.endpointId ?? undefined,
    projectId: input.projectId ?? undefined,
    page: input.page ?? 1,
    limit: input.limit ?? 20,
    status: input.status || undefined,
    eventType: input.eventType?.trim() || undefined,
    search: input.search?.trim() || undefined,
  }

  return useQuery({
    queryKey: webhookQueryKeys.list(params),
    queryFn: async () => {
      const response = await http.get<ApiResponse<PaginatedResult<WebhookEventRecord>>>(
        "/api/webhooks",
        { params }
      )
      return unwrapResponse(response.data)
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev, // keepPreviousData equivalent in v5
    enabled: Boolean(params.endpointId ?? params.projectId),
  })
}

/**
 * Single webhook event with delivery and log counts.
 */
export function useWebhookEventQuery(id: string | null) {
  return useQuery({
    queryKey: webhookQueryKeys.detail(id ?? ""),
    queryFn: async () => {
      const response = await http.get<ApiResponse<WebhookEventDetail>>(`/api/webhooks/${id}`)
      return unwrapResponse(response.data)
    },
    staleTime: 30_000,
    enabled: Boolean(id),
  })
}

/**
 * Paginated delivery attempts for a webhook event.
 */
export function useWebhookDeliveriesQuery(eventId: string | null, input: DeliveryQueryInput = {}) {
  const params = {
    page: input.page ?? 1,
    limit: input.limit ?? 20,
    status: input.status || undefined,
  }

  return useQuery({
    queryKey: webhookQueryKeys.deliveries(eventId ?? "", params),
    queryFn: async () => {
      const response = await http.get<ApiResponse<PaginatedResult<DeliveryRecord>>>(
        `/api/webhooks/${eventId}/deliveries`,
        { params }
      )
      return unwrapResponse(response.data)
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: Boolean(eventId),
  })
}

/**
 * Paginated audit log for a webhook event.
 */
export function useWebhookLogsQuery(eventId: string | null, input: LogQueryInput = {}) {
  const params = {
    page: input.page ?? 1,
    limit: input.limit ?? 20,
  }

  return useQuery({
    queryKey: webhookQueryKeys.logs(eventId ?? "", params),
    queryFn: async () => {
      const response = await http.get<ApiResponse<PaginatedResult<EventLogRecord>>>(
        `/api/webhooks/${eventId}/logs`,
        { params }
      )
      return unwrapResponse(response.data)
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: Boolean(eventId),
  })
}

/**
 * Retry / replay a webhook event. Invalidates the event detail query so counts
 * update immediately, without refetching the full events list.
 */
export function useRetryWebhookMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await http.post<ApiResponse<DeliveryRecord>>(
        `/api/webhooks/${eventId}/retry`
      )
      const { message } = response.data
      const delivery = unwrapResponse(response.data)
      return { delivery, message }
    },
    onSuccess: (_, eventId) => {
      void queryClient.invalidateQueries({ queryKey: webhookQueryKeys.detail(eventId) })
      void queryClient.invalidateQueries({
        queryKey: webhookQueryKeys.deliveries(eventId, {}),
        exact: false,
      })
    },
  })
}
