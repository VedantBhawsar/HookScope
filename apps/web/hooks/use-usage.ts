"use client"

import { useQuery } from "@tanstack/react-query"
import { http, unwrapResponse } from "@/lib/http"

export interface UsagePlan {
  tier: string
  eventsPerMonth: number
  endpointLimit: number
  retentionDays: number
}

export interface UsageRecord {
  currentMonth: string
  eventCount: number
  plan: UsagePlan
  endpoints: {
    used: number
    limit: number
  }
}

async function fetchUsage(): Promise<UsageRecord> {
  const res = await http.get<{ success: boolean; message: string; data: UsageRecord }>("/api/usage")
  return unwrapResponse(res.data)
}

export function useUsageQuery() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: fetchUsage,
    staleTime: 60_000, // refresh every minute
  })
}
