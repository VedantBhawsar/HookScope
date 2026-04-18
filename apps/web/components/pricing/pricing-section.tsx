"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PricingCard } from "./pricing-card"
import { PLANS, PRICING_FAQ, type BillingInterval } from "./pricing-data"
import { cn } from "@workspace/ui/lib/utils"
import { Separator } from "@workspace/ui/components/separator"
import { useMeQuery } from "@/hooks/use-auth"
import { useCheckoutMutation } from "@/hooks/use-billing"

export function PricingSection() {
  const [interval, setInterval] = useState<BillingInterval>("monthly")
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const router = useRouter()
  const meQuery = useMeQuery()
  const checkoutMutation = useCheckoutMutation()

  const isAuthenticated = !!meQuery.data?.user

  function handleSelectPlan(planId: string, billingInterval: BillingInterval) {
    if (!isAuthenticated) {
      router.push(`/auth/register?plan=${planId}&interval=${billingInterval}`)
      return
    }
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
    <div className="space-y-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Pricing</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          7 days free.
          <br />
          <span className="text-muted-foreground font-normal">Then just pay as you grow.</span>
        </h1>
        <p className="text-muted-foreground max-w-sm mx-auto text-base leading-relaxed">
          Full access to every feature on your plan <Separator className="max-w-1/4 mx-auto my-2"/> no compromise and no surprise fees.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border bg-muted p-1 text-sm">
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

      {/* Plan cards — 3 cols, wider cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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

      {/* Trial reassurance */}
      <p className="text-center text-sm text-muted-foreground">
        All plans include a{" "}
        <span className="text-foreground font-medium">7-day free trial</span>
        {" "}— no credit card required. Cancel or switch anytime.
      </p>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-5">
        <h2 className="text-xl font-semibold text-center">Common questions</h2>
        <dl className="space-y-3">
          {PRICING_FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border bg-card px-6 py-5">
              <dt className="text-sm font-semibold">{item.q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Enterprise CTA */}
      <div className="text-center rounded-2xl border bg-muted/30 px-8 py-12 space-y-3">
        <h2 className="text-lg font-semibold">Need more than Scale?</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Custom volumes, dedicated infrastructure, and SLA guarantees — let&apos;s talk.
        </p>
        <a
          href="mailto:rajawataryan7982@gmail.com"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Contact us for Enterprise →
        </a>
      </div>
    </div>
  )
}
