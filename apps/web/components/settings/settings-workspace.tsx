"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { useMeQuery } from "@/hooks/use-auth"
import { ProjectsTopbar } from "@/components/projects/projects-topbar"
import { ProfileSection } from "@/components/settings/profile-section"
import { WorkspaceSection } from "@/components/settings/workspace-section"
import { AppearanceSection } from "@/components/settings/appearance-section"

export function SettingsWorkspace() {
  const router = useRouter()
  const meQuery = useMeQuery()
  const user = meQuery.data?.user

  React.useEffect(() => {
    if (meQuery.isLoading) return
    if (!user) router.replace("/auth/login")
  }, [meQuery.isLoading, router, user])

  if (meQuery.isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ProjectsTopbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and workspace preferences.
          </p>
        </div>

        <div className="space-y-6">
          <ProfileSection user={user} />
          <WorkspaceSection user={user} />
          <AppearanceSection />
        </div>
      </main>
    </div>
  )
}
