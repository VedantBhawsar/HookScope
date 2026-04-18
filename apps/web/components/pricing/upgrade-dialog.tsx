"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog"
import { PricingCard } from "./pricing-card"
import { PLANS, type BillingInterval } from "./pricing-data"
import { cn } from "@workspace/ui/lib/utils"
import { useCheckoutMutation } from "@/hooks/use-billing"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: string
}

export function UpgradeDialog({ open, onOpenChange, reason }: UpgradeDialogProps) {
  const [interval, setInterval] = React.useState<BillingInterval>("monthly")
  const [loadingPlanId, setLoadingPlanId] = React.useState<string | null>(null)
  const checkoutMutation = useCheckoutMutation()

  function handleSelectPlan(planId: string, billingInterval: BillingInterval) {
    setLoadingPlanId(planId)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upgrade your plan</DialogTitle>
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
              isLoading={loadingPlanId === plan.id && checkoutMutation.isPending}
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-2">
          All plans include a{" "}
          <span className="text-foreground font-medium">7-day free trial</span> — no credit card required.
        </p>
      </DialogContent>
    </Dialog>
  )
}
