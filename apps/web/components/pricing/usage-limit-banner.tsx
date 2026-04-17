"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { usePricing } from "@/components/providers/pricing-provider"

export function UsageLimitBanner() {
  const { usage, isNearEventLimit, isAtEventLimit, openUpgradeDialog } = usePricing()
  const [dismissed, setDismissed] = useState(false)

  if (!usage || dismissed || (!isNearEventLimit && !isAtEventLimit)) return null

  const pct = Math.round((usage.eventCount / usage.plan.eventsPerMonth) * 100)

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-4 py-2.5 text-sm",
        isAtEventLimit
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">
        {isAtEventLimit
          ? `You've reached 100% of your event limit. New webhooks are being dropped.`
          : `You're at ${pct}% of your monthly event limit.`}
        {" "}
        <button
          onClick={() => openUpgradeDialog("Increase your event limit by upgrading your plan.")}
          className="font-semibold underline underline-offset-2 hover:opacity-80"
        >
          Upgrade now →
        </button>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
