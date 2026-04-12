"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"

export interface EndpointRecord {
  id: string
  projectId: string
  name: string
  source: string
  destinationUrl: string
  status: string
  verificationMode: string
  createdAt: string
}

export interface EndpointListResult {
  data: EndpointRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface EndpointsQueryInput {
  page?: number
  limit?: number
  search?: string
}

export interface EndpointDetailRecord extends EndpointRecord {
  _count: { events: number }
  signingSecret: string | null
  signatureHeader: string | null
  signatureType: string | null
  timestampHeader: string | null
  toleranceSec: number | null
  eventFilters: unknown
}

export interface CreateEndpointPayload {
  projectId: string
  name: string
  source: "STRIPE" | "GITHUB" | "SHOPIFY" | "SLACK" | "TWILIO" | "GENERIC"
  destinationUrl: string
}

export interface UpdateEndpointPayload {
  projectId: string
  endpointId: string
  name?: string
  destinationUrl?: string
  verificationMode?: string
  signingSecret?: string
  status?: "ACTIVE" | "PAUSED"
}

export const endpointsQueryKeys = {
  all: ["endpoints"] as const,
  byProject: (projectId: string) => ["endpoints", projectId] as const,
  list: (projectId: string, input: Required<EndpointsQueryInput>) =>
    ["endpoints", projectId, input] as const,
  detail: (projectId: string, endpointId: string) =>
    ["endpoints", projectId, endpointId] as const,
}

export function useEndpointsQuery(projectId: string | null, input?: EndpointsQueryInput) {
  const normalizedInput: Required<EndpointsQueryInput> = {
    page: input?.page ?? 1,
    limit: input?.limit ?? 100,
    search: input?.search ?? "",
  }

  return useQuery({
    queryKey: endpointsQueryKeys.list(projectId ?? "", normalizedInput),
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) {
        return {
          data: [],
          pagination: { page: 1, limit: normalizedInput.limit, total: 0, totalPages: 0 },
        } as EndpointListResult
      }

      const response = await http.get<ApiResponse<EndpointListResult>>(
        `/api/projects/${projectId}/endpoints`,
        {
          params: {
            page: normalizedInput.page,
            limit: normalizedInput.limit,
            search: normalizedInput.search || undefined,
          },
        }
      )

      return unwrapResponse(response.data)
    },
  })
}

export function useEndpointDetailQuery(
  projectId: string | null,
  endpointId: string | null
) {
  return useQuery({
    queryKey: endpointsQueryKeys.detail(projectId ?? "", endpointId ?? ""),
    enabled: Boolean(projectId && endpointId),
    queryFn: async () => {
      const response = await http.get<ApiResponse<EndpointDetailRecord>>(
        `/api/projects/${projectId}/endpoints/${endpointId}`
      )
      return unwrapResponse(response.data)
    },
  })
}

export function useCreateEndpointMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, ...payload }: CreateEndpointPayload) => {
      const response = await http.post<ApiResponse<EndpointRecord>>(
        `/api/projects/${projectId}/endpoints`,
        payload
      )
      const { message } = response.data
      const endpoint = unwrapResponse(response.data)
      return { endpoint, message }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: endpointsQueryKeys.byProject(variables.projectId) })
      await queryClient.invalidateQueries({ queryKey: endpointsQueryKeys.all })
    },
  })
}

export function useToggleEndpointStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      endpointId,
      status,
    }: {
      projectId: string
      endpointId: string
      status: "ACTIVE" | "PAUSED"
    }) => {
      const response = await http.patch<ApiResponse<EndpointRecord>>(
        `/api/projects/${projectId}/endpoints/${endpointId}/status`,
        { status }
      )
      const { message } = response.data
      const endpoint = unwrapResponse(response.data)
      return { endpoint, message }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: endpointsQueryKeys.byProject(variables.projectId),
      })
      await queryClient.invalidateQueries({
        queryKey: endpointsQueryKeys.detail(variables.projectId, variables.endpointId),
      })
    },
  })
}

export function useUpdateEndpointMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, endpointId, ...payload }: UpdateEndpointPayload) => {
      const response = await http.put<ApiResponse<EndpointRecord>>(
        `/api/projects/${projectId}/endpoints/${endpointId}`,
        payload
      )
      const { message } = response.data
      const endpoint = unwrapResponse(response.data)
      return { endpoint, message }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: endpointsQueryKeys.byProject(variables.projectId),
      })
      await queryClient.invalidateQueries({
        queryKey: endpointsQueryKeys.detail(variables.projectId, variables.endpointId),
      })
    },
  })
}

export function useDeleteEndpointMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      endpointId,
    }: {
      projectId: string
      endpointId: string
    }) => {
      const response = await http.delete<ApiResponse<null>>(
        `/api/projects/${projectId}/endpoints/${endpointId}`
      )
      const { success, message } = response.data
      if (!success) throw new Error(message || "Delete failed")
      return { message }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: endpointsQueryKeys.byProject(variables.projectId),
      })
      await queryClient.invalidateQueries({ queryKey: endpointsQueryKeys.all })
    },
  })
}

// ─── Overview: Stats ─────────────────────────────────────────────────────────

export interface EndpointStatsResult {
  totalEvents: number
  statusBreakdown: Record<string, number>
  successRate: number
  failureRate: number
}

export function useEndpointStatsQuery(
  projectId: string | null,
  endpointId: string | null
) {
  return useQuery({
    queryKey: ["endpoints", projectId ?? "", endpointId ?? "", "stats"],
    enabled: Boolean(projectId && endpointId),
    queryFn: async () => {
      const response = await http.get<ApiResponse<EndpointStatsResult>>(
        `/api/projects/${projectId}/endpoints/${endpointId}/stats`
      )
      return unwrapResponse(response.data)
    },
  })
}

// ─── Overview: Volume ────────────────────────────────────────────────────────

export interface VolumeDataPoint {
  hour: string
  delivered: number
  failed: number
  other: number
}

export interface EndpointVolumeResult {
  data: VolumeDataPoint[]
  windowHours: number
}

export function useEndpointVolumeQuery(
  projectId: string | null,
  endpointId: string | null,
  hours = 24
) {
  return useQuery({
    queryKey: ["endpoints", projectId ?? "", endpointId ?? "", "volume", hours],
    enabled: Boolean(projectId && endpointId),
    queryFn: async () => {
      const response = await http.get<ApiResponse<EndpointVolumeResult>>(
        `/api/projects/${projectId}/endpoints/${endpointId}/volume`,
        { params: { hours } }
      )
      return unwrapResponse(response.data)
    },
  })
}
