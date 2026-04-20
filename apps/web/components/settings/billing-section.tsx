"use client"

import * as React from "react"
import { ExternalLink, Loader2, CreditCard, Zap, ArrowLeftRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { useSubscriptionQuery, usePortalMutation } from "@/hooks/use-billing"
import { UpgradeDialog } from "@/components/pricing/upgrade-dialog"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIALING:   { label: "Trialing",   variant: "secondary" },
  ACTIVE:     { label: "Active",     variant: "default" },
  PAST_DUE:   { label: "Past Due",   variant: "destructive" },
  CANCELED:   { label: "Canceled",   variant: "outline" },
  UNPAID:     { label: "Unpaid",     variant: "destructive" },
  PAUSED:     { label: "Paused",     variant: "outline" },
  INCOMPLETE: { label: "Incomplete", variant: "secondary" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export function BillingSection() {
  const [upgradeOpen, setUpgradeOpen] = React.useState(false)
  const [changePlanOpen, setChangePlanOpen] = React.useState(false)
  const subQuery = useSubscriptionQuery()
  const portalMutation = usePortalMutation()

  const sub = subQuery.data
  const statusConfig = sub ? (STATUS_CONFIG[sub.status] ?? STATUS_CONFIG["ACTIVE"]) : null

  function handleManageBilling() {
    portalMutation.mutate(undefined, {
      onError: () => toast.error("No billing account found. Subscribe to a plan first."),
    })
  }

  return (
    <>
      <section className="rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              Billing
            </h2>
            <p className="text-sm text-muted-foreground">Manage your subscription and payment details.</p>
          </div>

          {sub && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChangePlanOpen(true)}
              >
                <ArrowLeftRight className="size-3.5" />
                Change Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="size-3.5" />
                )}
                Manage Billing
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {subQuery.isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        ) : sub ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight capitalize">
                {sub.tier.charAt(0) + sub.tier.slice(1).toLowerCase()}
              </span>
              {statusConfig && (
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {sub.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}
                </p>
                <p className="font-medium">{formatDate(sub.currentPeriodEnd)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Plan</p>
                <p className="font-medium capitalize">{sub.tier.toLowerCase()}</p>
              </div>
            </div>

            {sub.cancelAtPeriodEnd && (
              <p className="text-sm text-destructive/80 rounded-lg bg-destructive/10 px-4 py-2.5">
                Your plan will be canceled at the end of the billing period. Resume anytime from Manage Billing.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4 py-2">
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="size-3.5 text-muted-foreground" />
                Free tier
              </p>
              <p className="text-sm text-muted-foreground">
                You&apos;re on the free plan. Upgrade for more events, endpoints, and retention.
              </p>
            </div>
            <Button size="sm" onClick={() => setUpgradeOpen(true)}>
              Upgrade Plan
            </Button>
          </div>
        )}
      </section>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <UpgradeDialog
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        currentTier={sub?.tier}
      />
    </>
  )
}
