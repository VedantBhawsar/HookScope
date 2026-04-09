"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"
import { authQueryKeys } from "@/hooks/use-auth"

export interface CreateProjectPayload {
  name: string
  description?: string
}

export interface ProjectRecord {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const response = await http.post<ApiResponse<ProjectRecord>>("/api/projects", payload)
      return unwrapResponse(response.data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}
