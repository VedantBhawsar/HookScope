"use client"

import { useState } from "react"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { cn } from "@hookscope/ui/lib/utils"
import { PricingCard } from "@/components/pricing/pricing-card"
import { PLANS, type BillingInterval } from "@/components/pricing/pricing-data"

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]
const spring = { type: "spring", stiffness: 500, damping: 30 } as const

interface PlanStepProps {
  onSelect: (planId: string, interval: BillingInterval) => void
  loadingPlanId: string | null
  isPending: boolean
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
}

export function PlanStep({ onSelect, loadingPlanId, isPending }: PlanStepProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  const reduceMotion = useReducedMotion()

  return (
    <div className="space-y-7">
      {/* Interval toggle */}
      <div className="flex justify-center">
        <div
          className="inline-flex items-center gap-1 rounded-full border bg-muted p-1 text-sm"
          role="tablist"
          aria-label="Billing interval"
        >
          {(["monthly", "annual"] as const).map((value) => {
            const isActive = interval === value
            return (
              <button
                key={value}
                role="tab"
                aria-selected={isActive}
                onClick={() => setInterval(value)}
                className={cn(
                  "relative rounded-full px-5 py-1.5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="billing-thumb"
                    className="absolute inset-0 rounded-full bg-background shadow-sm"
                    transition={reduceMotion ? { duration: 0 } : spring}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {value === "monthly"
                    ? "Monthly"
                    : (
                      <>
                        Annual
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide">
                          SAVE 17%
                        </span>
                      </>
                    )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Plan cards */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: reduceMotion ? 0 : 0.08,
              delayChildren: 0.05,
            },
          },
        }}
      >
        {PLANS.map((plan) => (
          <motion.div key={plan.id} variants={cardVariants} className="h-full">
            <PricingCard
              plan={plan}
              interval={interval}
              onSelect={onSelect}
              isLoading={loadingPlanId === plan.id && isPending}
            />
          </motion.div>
        ))}
      </motion.div>

      <p className="text-center text-xs text-muted-foreground">
        All plans include a{" "}
        <span className="font-medium text-foreground">7-day free trial</span>
        {" "}— no credit card required. Cancel or switch anytime.
      </p>
    </div>
  )
}
