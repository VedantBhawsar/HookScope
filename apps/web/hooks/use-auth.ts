"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { http, unwrapResponse, type ApiResponse } from "@/lib/http"
import { clearAllWorkspaceLocalStorage } from "@/lib/project-navigation"

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

export interface SubscriptionInfo {
  status: string
  tier: string
  currentPeriodEnd: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  onboarding: AuthOnboardingState
  subscription: SubscriptionInfo | null
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

type RawSubscription = {
  status: string
  plan: { tier: string }
  currentPeriodEnd: string
} | null

type RawAuthUser = Omit<AuthUser, "onboarding" | "subscription"> & {
  avatarUrl?: string | null
  onboarding?: Partial<AuthOnboardingState> | null
}

function normalizeAuthUser(user: RawAuthUser, subscription?: RawSubscription): AuthUser {
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
    subscription: subscription
      ? { status: subscription.status, tier: subscription.plan.tier, currentPeriodEnd: subscription.currentPeriodEnd }
      : null,
  }
}

export function useMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: async () => {
      const response = await http.get<ApiResponse<{ user: RawAuthUser; subscription: RawSubscription }>>("/api/auth/me")
      const data = unwrapResponse(response.data)
      return { user: normalizeAuthUser(data.user, data.subscription) }
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
      const { message } = response.data
      return { message }
    },
    onSuccess: async () => {
      clearAllWorkspaceLocalStorage()
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
      const { message } = response.data
      const data = unwrapResponse(response.data)
      return { user: normalizeAuthUser(data.user), message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

export interface UpdateProfilePayload {
  name?: string
  companyName?: string
  companySize?: string
  companyRole?: string
  useCase?: string
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const response = await http.patch<ApiResponse<{ user: RawAuthUser }>>("/api/auth/profile", payload)
      const { message } = response.data
      const data = unwrapResponse(response.data)
      return { user: normalizeAuthUser(data.user), message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

// ── Email verification ────────────────────────────────────────────────────────

export function useSendVerificationOtpMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await http.post<ApiResponse<null>>("/api/auth/verify-email/send")
      return { message: response.data.message }
    },
  })
}

export function useVerifyEmailMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (otp: string) => {
      const response = await http.post<ApiResponse<null>>("/api/auth/verify-email/confirm", { otp })
      return { message: response.data.message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

// ── Linked social accounts ────────────────────────────────────────────────────

export interface LinkedAccount {
  provider: "GOOGLE" | "GITHUB"
  linkedAt: string
}

const linkedAccountsQueryKey = ["auth", "linked-accounts"]

export function useLinkedAccountsQuery() {
  return useQuery({
    queryKey: linkedAccountsQueryKey,
    queryFn: async () => {
      const response = await http.get<ApiResponse<{ accounts: LinkedAccount[] }>>("/api/auth/oauth/accounts")
      return unwrapResponse(response.data)
    },
  })
}

export function useUnlinkAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (provider: string) => {
      const response = await http.delete<ApiResponse<null>>(`/api/auth/oauth/${provider.toLowerCase()}`)
      return { message: response.data.message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: linkedAccountsQueryKey })
    },
  })
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await http.post<ApiResponse<null>>("/api/auth/forgot-password", { email })
      return { message: response.data.message }
    },
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      const response = await http.post<ApiResponse<null>>("/api/auth/reset-password", payload)
      return { message: response.data.message }
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
      const { message } = response.data
      const data = unwrapResponse(response.data)
      return { ...data, message }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}
