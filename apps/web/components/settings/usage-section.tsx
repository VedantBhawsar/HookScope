"use client"

import { Zap } from "lucide-react"
import { Progress } from "@hookscope/ui/components/progress"
import { Badge } from "@hookscope/ui/components/badge"
import { Button } from "@hookscope/ui/components/button"
import { Skeleton } from "@hookscope/ui/components/skeleton"
import { Separator } from "@hookscope/ui/components/separator"
import { useUsageQuery } from "@/hooks/use-usage"
import { usePricing } from "@/components/providers/pricing-provider"

function UsageMeter({
  label,
  used,
  limit,
  unit,
}: {
  label: string
  used: number
  limit: number
  unit: string
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isWarning = pct >= 80
  const isCritical = pct >= 95

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <Progress
        value={pct}
        className={
          isCritical
            ? "[&>[data-slot=progress-indicator]]:bg-destructive"
            : isWarning
              ? "[&>[data-slot=progress-indicator]]:bg-amber-500"
              : undefined
        }
      />
      <p className="text-xs text-muted-foreground">{pct}% used</p>
    </div>
  )
}

function UsageSectionSkeleton() {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Separator />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export function UsageSection() {
  const { data: usage, isLoading } = useUsageQuery()
  const { isNearEventLimit, isAtEndpointLimit, openUpgradeDialog } = usePricing()
  const showUpgradeCta = isNearEventLimit || isAtEndpointLimit

  if (isLoading) return <UsageSectionSkeleton />
  if (!usage) return null

  const tierLabel = usage.plan.tier.charAt(0) + usage.plan.tier.slice(1).toLowerCase()

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Usage</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Current billing period · {usage.currentMonth}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary">{tierLabel} Plan</Badge>
          {showUpgradeCta && (
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1.5 text-xs"
              onClick={() => openUpgradeDialog("Upgrade your plan to get more events and endpoints.")}
            >
              <Zap className="size-3" />
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-5">
        <UsageMeter
          label="Events this month"
          used={usage.eventCount}
          limit={usage.plan.eventsPerMonth}
          unit="events"
        />
        <UsageMeter
          label="Active endpoints"
          used={usage.endpoints.used}
          limit={usage.endpoints.limit}
          unit="endpoints"
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Event history retained for {usage.plan.retentionDays} days.
      </p>
    </div>
  )
}
