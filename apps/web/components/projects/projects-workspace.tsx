"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Clock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@hookscope/ui/components/button"
import { useMeQuery } from "@/hooks/use-auth"
import { type ProjectRecord } from "@/hooks/use-projects"
import { AppShell } from "@/components/layout/app-shell"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectsTableCard } from "@/components/projects/projects-table-card"
import { UsageLimitBanner } from "@/components/pricing/usage-limit-banner"
import {
  getGreeting,
  getLastOpenedProject,
  getProjectDashboardHref,
  setLastOpenedProject,
} from "@/lib/project-navigation"

export function ProjectsWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const meQuery = useMeQuery()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [lastOpened, setLastOpened] = React.useState<{ id: string; name: string } | null>(null)

  React.useEffect(() => {
    setLastOpened(getLastOpenedProject())
  }, [])

  React.useEffect(() => {
    if (searchParams.get("billing") === "success") {
      toast.success("Your trial has started! Welcome to HookScope.", { duration: 5000 })
      const params = new URLSearchParams(searchParams.toString())
      params.delete("billing")
      const clean = params.size ? `?${params}` : window.location.pathname
      window.history.replaceState(null, "", clean)
    }
  }, [searchParams])

  const user = meQuery.data?.user
  const companyName = user?.onboarding?.companyName
  const firstName = user?.name?.split(" ")[0] ?? ""

  const openProjectDashboard = (project: { id: string; name: string }) => {
    setLastOpenedProject(project)
    setLastOpened(project)
    router.push(getProjectDashboardHref(project.id))
  }

  const handleProjectCreated = (project: ProjectRecord) => {
    setLastOpenedProject({ id: project.id, name: project.name })
    setLastOpened({ id: project.id, name: project.name })
    router.push(getProjectDashboardHref(project.id))
  }

  return (
    <AppShell
      pageTitle={companyName ?? user?.name ?? "Projects"}
      pageLabel="Workspace"
    >
      <UsageLimitBanner />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {getGreeting()}{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {companyName
            ? `${companyName} · HookScope`
            : "Select a project to open its dashboard, or create a new one."}
        </p>
      </div>

      {lastOpened ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted">
              <Clock className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Continue where you left off</p>
              <p className="text-sm font-semibold">{lastOpened.name}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => openProjectDashboard(lastOpened)}>
            Open Dashboard
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <ProjectsTableCard
        onCreateProject={() => setCreateOpen(true)}
        onOpenProject={openProjectDashboard}
        onProjectUpdated={(project) => {
          if (lastOpened?.id === project.id) {
            setLastOpenedProject({ id: project.id, name: project.name })
            setLastOpened({ id: project.id, name: project.name })
          }
        }}
      />

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleProjectCreated}
      />
    </AppShell>
  )
}
