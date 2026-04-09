"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"

export interface AuthTokens {
  accessToken: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface AuthResult {
  user: AuthUser
  tokens: AuthTokens
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export const authQueryKeys = {
  me: ["auth", "me"] as const,
}

export function useMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: async () => {
      const response = await http.get<ApiResponse<{ user: AuthUser }>>("/api/auth/me")
      return unwrapResponse(response.data)
    },
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await http.post<ApiResponse<AuthResult>>("/api/auth/login", payload)
      return unwrapResponse(response.data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

export function useRegisterMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await http.post<ApiResponse<AuthResult>>("/api/auth/register", payload)
      return unwrapResponse(response.data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await http.post<ApiResponse<null>>("/api/auth/logout")
      return response.data.data
    },
    onSuccess: async () => {
      queryClient.setQueryData(authQueryKeys.me, null)
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}
