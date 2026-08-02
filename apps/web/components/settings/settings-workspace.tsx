"use client"

import { useMeQuery } from "@/hooks/use-auth"
import { AppShell } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { ProfileSection } from "@/components/settings/profile-section"
import { WorkspaceSection } from "@/components/settings/workspace-section"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { UsageSection } from "@/components/settings/usage-section"
import { BillingSection } from "@/components/settings/billing-section"
import { ConnectedAccountsSection } from "@/components/settings/connected-accounts-section"
import { UsageLimitBanner } from "@/components/pricing/usage-limit-banner"

export function SettingsWorkspace() {
  const meQuery = useMeQuery()
  const user = meQuery.data?.user

  return (
    <AppShell pageTitle="Settings" pageLabel="Account">
      <UsageLimitBanner />

      <PageHeader
        label="Account"
        title="Settings"
        description="Manage your profile and workspace preferences."
      />

      {user && (
        <div className="space-y-6">
          <ProfileSection user={user} />
          <WorkspaceSection user={user} />
          <ConnectedAccountsSection />
          <BillingSection />
          <UsageSection />
          <AppearanceSection />
        </div>
      )}
    </AppShell>
  )
}
