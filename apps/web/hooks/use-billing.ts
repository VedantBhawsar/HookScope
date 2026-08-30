"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { http, unwrapResponse } from "@/lib/http"

export interface SubscriptionRecord {
  status: string
  tier: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  dodoCustomerId: string | null
}

async function fetchSubscription(): Promise<SubscriptionRecord | null> {
  const res = await http.get<{ success: boolean; message: string; data: SubscriptionRecord | null }>(
    "/api/billing/subscription"
  )
  const data = unwrapResponse(res.data)
  if (!data || typeof data.tier !== "string") return null
  return data
}

async function createCheckoutSession(payload: {
  planId: string
  interval: "monthly" | "annual"
  returnTo?: "projects" | "settings"
}): Promise<{ url: string }> {
  const res = await http.post<{ success: boolean; message: string; data: { url: string } }>(
    "/api/billing/checkout",
    payload
  )
  const data = unwrapResponse(res.data)
  if (typeof data.url !== "string") {
    throw new Error("Billing is disabled")
  }
  return data
}

async function changePlan(payload: {
  planId: string
  interval: "monthly" | "annual"
}): Promise<{ message: string }> {
  const res = await http.post<{ success: boolean; message: string; data: { message: string } }>(
    "/api/billing/change-plan",
    payload
  )
  const data = unwrapResponse(res.data)
  return { ...data, message: res.data.message }
}

async function createPortalSession(): Promise<{ url: string }> {
  const res = await http.post<{ success: boolean; message: string; data: { url: string } }>(
    "/api/billing/portal",
    {}
  )
  const data = unwrapResponse(res.data)
  if (typeof data.url !== "string") {
    throw new Error("Billing is disabled")
  }
  return data
}

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    staleTime: 60_000,
  })
}

export function useCheckoutMutation() {
  return useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}

export function useChangePlanMutation() {
  return useMutation({ mutationFn: changePlan })
}

export function usePortalMutation() {
  return useMutation({
    mutationFn: createPortalSession,
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}
