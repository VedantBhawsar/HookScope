"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"
import { authQueryKeys } from "@/hooks/use-auth"

export interface CreateProjectPayload {
  name: string
  description?: string
}

export interface UpdateProjectPayload {
  id: string
  name?: string
  description?: string
}

export interface ProjectRecord {
  id: string
  name: string
  description: string | null
  endpointCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectListResult {
  data: ProjectRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ProjectsQueryInput {
  page?: number
  limit?: number
  search?: string
}

export const projectsQueryKeys = {
  all: ["projects"] as const,
  list: (input: Required<ProjectsQueryInput>) => ["projects", input] as const,
}

export function useProjectsQuery(input?: ProjectsQueryInput) {
  const normalizedInput: Required<ProjectsQueryInput> = {
    page: input?.page ?? 1,
    limit: input?.limit ?? 100,
    search: input?.search ?? "",
  }

  return useQuery({
    queryKey: projectsQueryKeys.list(normalizedInput),
    queryFn: async () => {
      const response = await http.get<ApiResponse<ProjectListResult>>("/api/projects", {
        params: {
          page: normalizedInput.page,
          limit: normalizedInput.limit,
          search: normalizedInput.search || undefined,
        },
      })
      return unwrapResponse(response.data)
    },
  })
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const response = await http.post<ApiResponse<ProjectRecord>>("/api/projects", payload)
      const { message } = response.data
      const project = unwrapResponse(response.data)
      return { project, message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateProjectPayload) => {
      const response = await http.put<ApiResponse<ProjectRecord>>(`/api/projects/${id}`, payload)
      const { message } = response.data
      const project = unwrapResponse(response.data)
      return { project, message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all })
    },
  })
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await http.delete<ApiResponse<null>>(`/api/projects/${id}`)
      const { success, message } = response.data
      if (!success) throw new Error(message || "Delete failed")
      return { message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all })
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}
