"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"

export interface AuthTokens {
  accessToken: string
  expiresIn: number
}

export interface AuthOnboardingState {
  emailVerified: boolean
  companyName: string | null
  companySize: string | null
  companyRole: string | null
  useCase: string | null
  onboardingCompleted: boolean
  hasCreatedProject: boolean
  isNewUser: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  onboarding: AuthOnboardingState
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

export interface CompleteOnboardingPayload {
  companyName: string
  companySize?: string
  companyRole?: string
  useCase?: string
}

export const authQueryKeys = {
  me: ["auth", "me"] as const,
}

const DEFAULT_ONBOARDING: AuthOnboardingState = {
  emailVerified: false,
  companyName: null,
  companySize: null,
  companyRole: null,
  useCase: null,
  onboardingCompleted: false,
  hasCreatedProject: false,
  isNewUser: true,
}

type RawAuthUser = Omit<AuthUser, "onboarding"> & {
  avatarUrl?: string | null
  onboarding?: Partial<AuthOnboardingState> | null
}

function normalizeAuthUser(user: RawAuthUser): AuthUser {
  const rawOnboarding = user.onboarding ?? {}
  const companyName = rawOnboarding.companyName ?? null
  const hasCreatedProject = Boolean(rawOnboarding.hasCreatedProject)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    onboarding: {
      ...DEFAULT_ONBOARDING,
      ...rawOnboarding,
      emailVerified: Boolean(rawOnboarding.emailVerified),
      companyName,
      companySize: rawOnboarding.companySize ?? null,
      companyRole: rawOnboarding.companyRole ?? null,
      useCase: rawOnboarding.useCase ?? null,
      hasCreatedProject,
      onboardingCompleted:
        typeof rawOnboarding.onboardingCompleted === "boolean"
          ? rawOnboarding.onboardingCompleted
          : Boolean(companyName && hasCreatedProject),
      isNewUser:
        typeof rawOnboarding.isNewUser === "boolean"
          ? rawOnboarding.isNewUser
          : !companyName && !hasCreatedProject,
    },
  }
}

export function useMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: async () => {
      const response = await http.get<ApiResponse<{ user: RawAuthUser }>>("/api/auth/me")
      const data = unwrapResponse(response.data)
      return { user: normalizeAuthUser(data.user) }
    },
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await http.post<ApiResponse<{ user: RawAuthUser; tokens: AuthTokens }>>("/api/auth/login", payload)
      const data = unwrapResponse(response.data)
      return { user: normalizeAuthUser(data.user), tokens: data.tokens }
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
      const response = await http.post<ApiResponse<{ user: RawAuthUser; tokens: AuthTokens }>>(
        "/api/auth/register",
        payload
      )
      const data = unwrapResponse(response.data)
      return { user: normalizeAuthUser(data.user), tokens: data.tokens }
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

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CompleteOnboardingPayload) => {
      const response = await http.patch<ApiResponse<{ user: RawAuthUser }>>("/api/auth/onboarding", payload)
      const data = unwrapResponse(response.data)
      return { user: normalizeAuthUser(data.user) }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("avatar", file)
      const response = await http.post<ApiResponse<{ avatarUrl: string }>>("/api/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message ?? "Avatar upload failed")
      }
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}
