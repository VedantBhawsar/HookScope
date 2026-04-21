"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { AvatarUploadDialog } from "@/components/dashboard/avatar-upload-dialog"
import { NotificationBell } from "@/components/alerts/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"

interface AppShellProps {
  children: React.ReactNode
  pageTitle: string
  pageLabel?: string
}

export function AppShell({ children, pageTitle, pageLabel = "Workspace" }: AppShellProps) {
  const router = useRouter()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const [avatarUploadOpen, setAvatarUploadOpen] = React.useState(false)

  React.useEffect(() => {
    if (meQuery.isLoading) return
    const user = meQuery.data?.user
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (!user.onboarding?.onboardingCompleted) {
      router.replace("/onboarding?step=verify")
      return
    }
    const sub = user.subscription
    const isActive = sub?.status === "ACTIVE" || sub?.status === "TRIALING"
    if (!isActive) {
      router.replace("/pricing")
    }
  }, [meQuery.data?.user, meQuery.isLoading, router])

  if (meQuery.isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading workspace...
        </div>
      </section>
    )
  }

  const user = meQuery.data?.user
  const sub = user?.subscription
  const isActive = sub?.status === "ACTIVE" || sub?.status === "TRIALING"

  if (!user || !user.onboarding?.onboardingCompleted || !isActive) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Redirecting...
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[260px_1fr]">
        <DashboardSidebar
          mode="projects"
          user={user}
          onOpenAvatarUpload={() => setAvatarUploadOpen(true)}
          onLogout={() => logoutMutation.mutate()}
          isLogoutPending={logoutMutation.isPending}
        />

        <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="mx-auto flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {pageLabel}
                </p>
                <p className="truncate font-heading text-lg font-semibold">{pageTitle}</p>
              </div>
              <div className="flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      <AvatarUploadDialog
        open={avatarUploadOpen}
        onOpenChange={setAvatarUploadOpen}
        currentAvatarUrl={user.avatarUrl}
        userName={user.name}
      />
    </div>
  )
}
