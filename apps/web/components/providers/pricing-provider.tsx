"use client"

import * as React from "react"
import { useUsageQuery } from "@/hooks/use-usage"
import type { UsageRecord } from "@/hooks/use-usage"
import { UpgradeDialog } from "@/components/pricing/upgrade-dialog"

interface PricingContextValue {
  usage: UsageRecord | undefined
  isLoading: boolean
  openUpgradeDialog: (reason?: string) => void
  isAtEndpointLimit: boolean
  isNearEventLimit: boolean
  isAtEventLimit: boolean
}

const PricingContext = React.createContext<PricingContextValue | null>(null)

export function usePricing() {
  const ctx = React.useContext(PricingContext)
  if (!ctx) throw new Error("usePricing must be used inside PricingProvider")
  return ctx
}

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const { data: usage, isLoading } = useUsageQuery()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [upgradeReason, setUpgradeReason] = React.useState<string | undefined>()

  const openUpgradeDialog = React.useCallback((reason?: string) => {
    setUpgradeReason(reason)
    setDialogOpen(true)
  }, [])

  const endpointPct = usage ? (usage.endpoints.used / usage.endpoints.limit) * 100 : 0
  const eventPct = usage ? (usage.eventCount / usage.plan.eventsPerMonth) * 100 : 0

  return (
    <PricingContext.Provider
      value={{
        usage,
        isLoading,
        openUpgradeDialog,
        isAtEndpointLimit: endpointPct >= 100,
        isNearEventLimit: eventPct >= 80,
        isAtEventLimit: eventPct >= 100,
      }}
    >
      {children}
      <UpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} reason={upgradeReason} />
    </PricingContext.Provider>
  )
}
