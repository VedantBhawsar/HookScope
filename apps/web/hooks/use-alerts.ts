"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType = "DELIVERY_FAILURE_RATE" | "DELIVERY_ERROR_CODE" | "EVENT_FAILED" | "ENDPOINT_SILENCE"
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL"

export interface AlertEndpoint {
  id: string
  name: string
  source: string
}

export interface AlertRecord {
  id: string
  name: string
  type: AlertType
  severity: AlertSeverity
  config: Record<string, unknown>
  isActive: boolean
  endpointId: string | null
  userId: string
  createdAt: string
  updatedAt: string
  endpoint: AlertEndpoint | null
  triggers?: Array<{ createdAt: string }>
  _count: { triggers: number }
}

export interface AlertEndpointOption {
  id: string
  name: string
  source: string
  projectId: string
  projectName: string
}

export interface AlertTriggerRecord {
  id: string
  alertId: string
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AlertTriggerWithAlert extends AlertTriggerRecord {
  alert: { id: string; name: string; severity: AlertSeverity; type: AlertType }
}

export interface AlertListResult {
  data: AlertRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface AlertTriggerListResult {
  data: AlertTriggerRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface AlertTriggerHistoryResult {
  data: AlertTriggerWithAlert[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateAlertTestTriggerPayload {
  alertId: string
  message?: string
  metadata?: Record<string, unknown>
}

interface ProjectListResult {
  data: Array<{ id: string; name: string }>
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface EndpointListResult {
  data: Array<{ id: string; name: string; source: string; projectId: string }>
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateAlertPayload {
  name: string
  type: AlertType
  severity: AlertSeverity
  endpointId?: string | null
  config: Record<string, unknown>
  isActive?: boolean
}

export type UpdateAlertPayload = Partial<CreateAlertPayload> & { id: string }

// ─── Query keys ───────────────────────────────────────────────────────────────

export const alertQueryKeys = {
  all: ["alerts"] as const,
  list: (params: { page: number; limit: number; search?: string }) => ["alerts", "list", params] as const,
  detail: (id: string) => ["alerts", "detail", id] as const,
  triggers: (alertId: string, params: { page: number; limit: number }) =>
    ["alerts", "triggers", alertId, params] as const,
  history: (params: { page: number; limit: number }) => ["alerts", "history", params] as const,
  endpointOptions: ["alerts", "endpoint-options"] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAlertsQuery({ page = 1, limit = 10, search }: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: alertQueryKeys.list({ page, limit, search }),
    queryFn: async () => {
      const response = await http.get<ApiResponse<AlertListResult>>("/api/alerts", {
        params: { page, limit, search: search || undefined },
      })
      return unwrapResponse(response.data)
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useAlertDetailQuery(id: string) {
  return useQuery({
    queryKey: alertQueryKeys.detail(id),
    queryFn: async () => {
      const response = await http.get<ApiResponse<AlertRecord>>(`/api/alerts/${id}`)
      return unwrapResponse(response.data)
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function useAlertTriggersQuery(alertId: string, { page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: alertQueryKeys.triggers(alertId, { page, limit }),
    queryFn: async () => {
      const response = await http.get<ApiResponse<AlertTriggerListResult>>(`/api/alerts/${alertId}/triggers`, {
        params: { page, limit },
      })
      return unwrapResponse(response.data)
    },
    enabled: Boolean(alertId),
    staleTime: 30_000,
  })
}

export function useAlertHistoryQuery({ page = 1, limit = 20 } = {}) {
  return useQuery({
    queryKey: alertQueryKeys.history({ page, limit }),
    queryFn: async () => {
      const response = await http.get<ApiResponse<AlertTriggerHistoryResult>>("/api/alerts/history", {
        params: { page, limit },
      })
      return unwrapResponse(response.data)
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useAlertEndpointOptionsQuery() {
  return useQuery({
    queryKey: alertQueryKeys.endpointOptions,
    queryFn: async () => {
      const projectsResponse = await http.get<ApiResponse<ProjectListResult>>("/api/projects", {
        params: { page: 1, limit: 100 },
      })
      const projects = unwrapResponse(projectsResponse.data).data

      if (projects.length === 0) return [] as AlertEndpointOption[]

      const endpointResponses = await Promise.all(
        projects.map(async (project) => {
          const response = await http.get<ApiResponse<EndpointListResult>>(`/api/projects/${project.id}/endpoints`, {
            params: { page: 1, limit: 100 },
          })
          const endpointList = unwrapResponse(response.data).data
          return endpointList.map((endpoint) => ({
            id: endpoint.id,
            name: endpoint.name,
            source: endpoint.source,
            projectId: project.id,
            projectName: project.name,
          }))
        })
      )

      return endpointResponses.flat()
    },
    staleTime: 30_000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAlertMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAlertPayload) => {
      const response = await http.post<ApiResponse<AlertRecord>>("/api/alerts", payload)
      const { message } = response.data
      const alert = unwrapResponse(response.data)
      return { alert, message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.all })
    },
  })
}

export function useUpdateAlertMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateAlertPayload) => {
      const response = await http.patch<ApiResponse<AlertRecord>>(`/api/alerts/${id}`, payload)
      const { message } = response.data
      const alert = unwrapResponse(response.data)
      return { alert, message }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.detail(variables.id) })
    },
  })
}

export function useDeleteAlertMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await http.delete<ApiResponse<null>>(`/api/alerts/${id}`)
      const { success, message } = response.data
      if (!success) throw new Error(message || "Delete failed")
      return { message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.all })
    },
  })
}

export function useCreateAlertTestTriggerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ alertId, message, metadata }: CreateAlertTestTriggerPayload) => {
      const response = await http.post<ApiResponse<AlertTriggerRecord>>(
        `/api/alerts/${alertId}/test-trigger`,
        {
          message,
          metadata,
        }
      )
      const { message: responseMessage } = response.data
      const trigger = unwrapResponse(response.data)
      return { trigger, message: responseMessage }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.triggers(variables.alertId, { page: 1, limit: 20 }) })
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.history({ page: 1, limit: 20 }) })
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.all })
    },
  })
}
