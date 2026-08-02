"use client"

import Link from "next/link"
import { Check, X, Minus, Loader2 } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@hookscope/ui/components/card"
import { Badge } from "@hookscope/ui/components/badge"
import { Button } from "@hookscope/ui/components/button"
import { cn } from "@hookscope/ui/lib/utils"
import type { Plan, BillingInterval } from "./pricing-data"

function FeatureRow({ label, included }: { label: string; included: boolean | string }) {
  if (included === false) {
    return (
      <li className="flex items-center gap-3 text-muted-foreground/60">
        <X className="size-4 shrink-0" />
        <span className="text-sm line-through decoration-muted-foreground/40">{label}</span>
      </li>
    )
  }
  if (included === true) {
    return (
      <li className="flex items-center gap-3">
        <Check className="size-4 shrink-0 text-primary" />
        <span className="text-sm">{label}</span>
      </li>
    )
  }
  return (
    <li className="flex items-center gap-3">
      <Minus className="size-4 shrink-0 text-primary/60" />
      <span className="text-sm">
        {label}
        <span className="ml-1.5 text-xs font-medium text-primary">{included}</span>
      </span>
    </li>
  )
}

interface PricingCardProps {
  plan: Plan
  interval: BillingInterval
  onSelect?: (planId: string, interval: BillingInterval) => void
  isLoading?: boolean
  isCurrent?: boolean
}

export function PricingCard({ plan, interval, onSelect, isLoading, isCurrent }: PricingCardProps) {
  const reduceMotion = useReducedMotion()
  const isAnnual = interval === "annual"
  const isFree = plan.id === "free"

  const usdPrice = isAnnual ? plan.annualPriceUsd : plan.monthlyPriceUsd
  const monthlyEquivalentUsd =
    isAnnual && plan.annualPriceUsd !== null && plan.annualPriceUsd > 0
      ? Math.round(plan.annualPriceUsd / 12)
      : null
  const monthlyEquivalentInr =
    isAnnual && plan.annualPriceInr !== null && plan.annualPriceInr > 0
      ? Math.round(plan.annualPriceInr / 12)
      : null
  const inrPrice = isAnnual ? plan.annualPriceInr : plan.monthlyPriceInr

  return (
    <motion.div
      className="h-full"
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      <Card
        className={cn(
          "relative flex h-full flex-col transition-shadow overflow-visible",
          plan.highlight
            ? "border-primary ring-2 ring-primary shadow-lg shadow-primary/10"
            : "hover:shadow-md"
        )}
      >
        {plan.badge && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-50">
            <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-sm">
              {plan.badge}
            </Badge>
          </div>
        )}

      <CardHeader className="px-7 pt-8 pb-0 space-y-5">
        {/* Plan name + description */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {plan.name}
          </p>
          <p className="text-sm text-foreground/70 leading-snug">{plan.description}</p>
        </div>

        {/* Price */}
        <div>
          {isFree ? (
            <>
              <span className="text-5xl font-bold tracking-tight">Free</span>
              <p className="mt-1 text-xs text-muted-foreground">No credit card required</p>
            </>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tight">
                  ${monthlyEquivalentUsd ?? usdPrice}
                </span>
                <span className="mb-1.5 text-sm text-muted-foreground">/ mo</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ₹{monthlyEquivalentInr ?? inrPrice} / mo
              </p>
              {isAnnual && monthlyEquivalentUsd ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Billed ${plan.annualPriceUsd}/yr &mdash; 2 months free
                </p>
              ) : null}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 px-7 pt-6 pb-8">
        {/* CTA */}
        {onSelect ? (
          <Button
            size="lg"
            variant={isCurrent ? "secondary" : plan.highlight ? "default" : "outline"}
            className="min-h-11 w-full"
            onClick={() => !isCurrent && onSelect(plan.id, interval)}
            disabled={isLoading || isCurrent}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isCurrent ? (
              "Current plan"
            ) : (
              plan.cta
            )}
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            variant={plan.highlight ? "default" : "outline"}
            className="min-h-11 w-full"
          >
            <Link href={plan.ctaHref}>{plan.cta}</Link>
          </Button>
        )}

        {/* Limits grid */}
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(plan.limits) as [string, string][]).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-muted/50 px-3 py-2.5">
              <p className="text-sm font-semibold">{value}</p>
              <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{key}</p>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <ul className="space-y-3 border-t pt-5">
          {plan.features.map((feature) => (
            <FeatureRow key={feature.label} {...feature} />
          ))}
        </ul>
      </CardContent>
      </Card>
    </motion.div>
  )
}
