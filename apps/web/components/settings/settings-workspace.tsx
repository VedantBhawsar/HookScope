"use client"

import { useMeQuery } from "@/hooks/use-auth"
import { AppShell } from "@/components/layout/app-shell"
import { ProfileSection } from "@/components/settings/profile-section"
import { WorkspaceSection } from "@/components/settings/workspace-section"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { UsageSection } from "@/components/settings/usage-section"
import { BillingSection } from "@/components/settings/billing-section"
import { UsageLimitBanner } from "@/components/pricing/usage-limit-banner"

export function SettingsWorkspace() {
  const meQuery = useMeQuery()
  const user = meQuery.data?.user

  return (
    <AppShell pageTitle="Settings" pageLabel="Account">
      <UsageLimitBanner />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and workspace preferences.
        </p>
      </div>

      {user && (
        <div className="space-y-6">
          <ProfileSection user={user} />
          <WorkspaceSection user={user} />
          <BillingSection />
          <UsageSection />
          <AppearanceSection />
        </div>
      )}
    </AppShell>
  )
}
