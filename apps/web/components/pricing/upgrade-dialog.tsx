"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@hookscope/ui/components/dialog"
import { PricingCard } from "./pricing-card"
import { PLANS, type BillingInterval } from "./pricing-data"
import { cn } from "@hookscope/ui/lib/utils"
import { useCheckoutMutation, useChangePlanMutation } from "@/hooks/use-billing"
import { useQueryClient } from "@tanstack/react-query"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
  currentTier?: string
}

export function UpgradeDialog({ open, onOpenChange, reason, currentTier }: UpgradeDialogProps) {
  const [interval, setInterval] = React.useState<BillingInterval>("monthly")
  const [loadingPlanId, setLoadingPlanId] = React.useState<string | null>(null)
  const queryClient = useQueryClient()
  const checkoutMutation = useCheckoutMutation()
  const changePlanMutation = useChangePlanMutation()

  const isChangingPlan = Boolean(currentTier)

  function handleSelectPlan(planId: string, billingInterval: BillingInterval) {
    setLoadingPlanId(planId)

    if (isChangingPlan) {
      changePlanMutation.mutate(
        { planId, interval: billingInterval },
        {
          onSuccess: (result) => {
            toast.success(result.message)
            queryClient.invalidateQueries({ queryKey: ["subscription"] })
            onOpenChange(false)
            setLoadingPlanId(null)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : "Failed to change plan. Please try again.")
            setLoadingPlanId(null)
          },
        }
      )
    } else {
      checkoutMutation.mutate(
        { planId, interval: billingInterval, returnTo: "settings" },
        {
          onError: () => {
            toast.error("Failed to start checkout. Please try again.")
            setLoadingPlanId(null)
          },
        }
      )
    }
  }

  const isPending = checkoutMutation.isPending || changePlanMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isChangingPlan ? "Change your plan" : "Upgrade your plan"}
          </DialogTitle>
          {reason && (
            <DialogDescription className="text-sm">{reason}</DialogDescription>
          )}
        </DialogHeader>

        {/* Billing toggle */}
        <div className="flex justify-center mt-2">
          <div className="inline-flex items-center gap-1 rounded-full border bg-muted p-1 text-sm">
            <button
              onClick={() => setInterval("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition-all",
                interval === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-all",
                interval === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide">
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-2">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              interval={interval}
              onSelect={handleSelectPlan}
              isLoading={loadingPlanId === plan.id && isPending}
              isCurrent={currentTier?.toLowerCase() === plan.id}
            />
          ))}
        </div>

        {isChangingPlan ? (
          <p className="text-center text-xs text-muted-foreground pb-2">
            Upgrades take effect immediately. Downgrades apply at the start of your next billing cycle.
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground pb-2">
            All plans include a{" "}
            <span className="text-foreground font-medium">7-day free trial</span> — no credit card required.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
