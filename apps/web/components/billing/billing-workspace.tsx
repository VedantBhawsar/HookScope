"use client"

import { AppShell } from "@/components/layout/app-shell"
import { BillingSection } from "@/components/settings/billing-section"
import { UsageSection } from "@/components/settings/usage-section"
import { UsageLimitBanner } from "@/components/pricing/usage-limit-banner"

export function BillingWorkspace() {
  return (
    <AppShell pageTitle="Billing" pageLabel="Account">
      <UsageLimitBanner />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and payment details.
        </p>
      </div>

      <div className="space-y-6">
        <BillingSection />
        <UsageSection />
      </div>
    </AppShell>
  )
}
