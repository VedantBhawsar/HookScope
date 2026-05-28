"use client"

import { useState } from "react"
import { cn } from "@hookscope/ui/lib/utils"
import { PricingCard } from "@/components/pricing/pricing-card"
import { PLANS, type BillingInterval } from "@/components/pricing/pricing-data"

interface PlanStepProps {
  onSelect: (planId: string, interval: BillingInterval) => void
  loadingPlanId: string | null
  isPending: boolean
}

export function PlanStep({ onSelect, loadingPlanId, isPending }: PlanStepProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly")

  return (
    <div className="space-y-7">
      {/* Interval toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border bg-muted p-1 text-sm">
          <button
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-full px-5 py-1.5 font-medium transition-all",
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
              "flex items-center gap-2 rounded-full px-5 py-1.5 font-medium transition-all",
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

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            interval={interval}
            onSelect={onSelect}
            isLoading={loadingPlanId === plan.id && isPending}
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        All plans include a{" "}
        <span className="font-medium text-foreground">7-day free trial</span>
        {" "}— no credit card required. Cancel or switch anytime.
      </p>
    </div>
  )
}
