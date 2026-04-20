import Link from "next/link"
import { Check, X, Minus, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
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
  const isAnnual = interval === "annual"
  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice
  const monthlyEquivalent =
    isAnnual && plan.annualPrice !== null && plan.annualPrice > 0
      ? Math.round(plan.annualPrice / 12)
      : null

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-shadow overflow-visible",
        plan.highlight
          ? "border-primary ring-2 ring-primary shadow-lg shadow-primary/10"
          : "hover:shadow-md"
      )}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-[999]">
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
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight">
              ${monthlyEquivalent ?? price}
            </span>
            <div className="mb-1.5 flex flex-col items-start">
              {plan.originalMonthlyPrice && !isAnnual && (
                <span className="text-xs text-muted-foreground line-through">
                  ${plan.originalMonthlyPrice}
                </span>
              )}
              <span className="text-sm text-muted-foreground">/ mo</span>
            </div>
          </div>
          {isAnnual && monthlyEquivalent ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Billed ${plan.annualPrice}/yr &mdash; 2 months free
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              7-day free trial &mdash; no credit card needed
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6 px-7 pt-6 pb-8">
        {/* CTA */}
        {onSelect ? (
          <Button
            size="lg"
            variant={isCurrent ? "secondary" : plan.highlight ? "default" : "outline"}
            className="w-full"
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
            className="w-full"
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
  )
}
