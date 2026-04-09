"use client"

import { useQuery } from "@tanstack/react-query"
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

export const endpointsQueryKeys = {
  all: ["endpoints"] as const,
  byProject: (projectId: string) => ["endpoints", projectId] as const,
  list: (projectId: string, input: Required<EndpointsQueryInput>) =>
    ["endpoints", projectId, input] as const,
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
