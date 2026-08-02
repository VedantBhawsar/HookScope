"use client"

import { AppShell } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BillingSection } from "@/components/settings/billing-section"
import { UsageSection } from "@/components/settings/usage-section"
import { UsageLimitBanner } from "@/components/pricing/usage-limit-banner"

export function BillingWorkspace() {
  return (
    <AppShell pageTitle="Billing" pageLabel="Account">
      <UsageLimitBanner />

      <PageHeader
        label="Account"
        title="Billing"
        description="Manage your subscription and payment details."
      />

      <div className="space-y-6">
        <BillingSection />
        <UsageSection />
      </div>
    </AppShell>
  )
}
