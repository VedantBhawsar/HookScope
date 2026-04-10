"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Clock,
  LoaderCircle,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { getRequestErrorMessage } from "@/lib/http"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import {
  useDeleteProjectMutation,
  useProjectsQuery,
  type ProjectRecord,
} from "@/hooks/use-projects"
import { ConfirmDeleteDialog } from "@workspace/ui/components/confirm-delete-dialog"
import { CreateEndpointDialog } from "@/components/endpoints/create-endpoint-dialog"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"
import { ProjectsTopbar } from "@/components/projects/projects-topbar"
import { ProjectsTableCard } from "@/components/projects/projects-table-card"
import { getActiveEndpointForProject } from "@/lib/endpoint-selection"

const LAST_OPENED_KEY = "last_opened_project"

function getLastOpenedProject(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem(LAST_OPENED_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { id: string; name: string }
  } catch {
    return null
  }
}

function setLastOpenedProject(project: { id: string; name: string }) {
  try {
    localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(project))
  } catch {
    //
  }
}

function getProjectDashboardHref(projectId: string): string {
  const storedEndpoint = getActiveEndpointForProject(projectId)
  if (!storedEndpoint?.id) {
    return `/dashboard/${encodeURIComponent(projectId)}`
  }

  return `/dashboard/${encodeURIComponent(projectId)}/${encodeURIComponent(storedEndpoint.id)}`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function ProjectsWorkspace() {
  const router = useRouter()
  const meQuery = useMeQuery()
  const projectsQuery = useProjectsQuery()
  const deleteProjectMutation = useDeleteProjectMutation()
  const logoutMutation = useLogoutMutation()

  const [searchTerm, setSearchTerm] = React.useState("")

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false)

  // Edit dialog
  const [editProject, setEditProject] = React.useState<ProjectRecord | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectRecord | null>(null)

  // Last opened
  const [lastOpened, setLastOpened] = React.useState<{ id: string; name: string } | null>(null)

  React.useEffect(() => {
    setLastOpened(getLastOpenedProject())
  }, [])

  const projects = projectsQuery.data?.data ?? []
  const [endpointDialogProject, setEndpointDialogProject] = React.useState<ProjectRecord | null>(null)
  const user = meQuery.data?.user

  React.useEffect(() => {
    if (meQuery.isLoading) return

    if (!user) {
      router.replace("/auth/login")
      return
    }

    if (!user.onboarding.onboardingCompleted) {
      router.replace("/onboarding?step=verify")
    }
  }, [meQuery.isLoading, router, user])

  const filteredProjects = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return projects

    return projects.filter((project) => {
      const nameMatch = project.name.toLowerCase().includes(query)
      const descriptionMatch = project.description?.toLowerCase().includes(query)
      return nameMatch || Boolean(descriptionMatch)
    })
  }, [projects, searchTerm])

  const openProjectDashboard = (project: ProjectRecord) => {
    setLastOpenedProject({ id: project.id, name: project.name })
    setLastOpened({ id: project.id, name: project.name })
    router.push(getProjectDashboardHref(project.id))
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      router.replace("/auth/login")
    } catch {
      router.replace("/auth/login")
    }
  }

  // Create dialog handlers
  const openCreateDialog = () => {
    setCreateOpen(true)
  }

  const handleProjectCreated = (project: ProjectRecord) => {
    setLastOpenedProject({ id: project.id, name: project.name })
    setLastOpened({ id: project.id, name: project.name })
    router.push(getProjectDashboardHref(project.id))
  }

  // Edit dialog handlers
  const openEditDialog = (project: ProjectRecord) => {
    setEditProject(project)
  }

  const closeEditDialog = () => {
    setEditProject(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProjectMutation.mutateAsync(deleteTarget.id)
      if (editProject?.id === deleteTarget.id) closeEditDialog()
      setDeleteTarget(null)
    } catch {
      //
    }
  }

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const lastOpenedProject = lastOpened
    ? projects.find((project) => project.id === lastOpened.id) ?? null
    : null

  const firstName = user?.name.split(" ")[0] ?? ""
  const companyName = user?.onboarding.companyName

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ProjectsTopbar
        user={user ?? null}
        isLogoutPending={logoutMutation.isPending}
        onLogout={handleLogout}
      />

      {/* ── Page body ── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {companyName
              ? `${companyName} · Webhook observability workspace`
              : "Select a project to open its dashboard, or create a new one."}
          </p>
        </div>

        {/* Last opened hero */}
        {lastOpenedProject ? (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted">
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Continue where you left off</p>
                <p className="text-sm font-semibold">{lastOpenedProject.name}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => openProjectDashboard(lastOpenedProject)}>
              Open Dashboard
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        ) : null}

        <ProjectsTableCard
          projects={filteredProjects}
          allProjectsCount={projects.length}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onCreateProject={openCreateDialog}
          onOpenProject={openProjectDashboard}
          onEditProject={openEditDialog}
          onCreateEndpoint={setEndpointDialogProject}
          onDeleteProject={(projectId) => {
            const project = projects.find((p) => p.id === projectId) ?? null
            setDeleteTarget(project)
          }}
          isLoading={projectsQuery.isLoading}
          isDeleting={deleteProjectMutation.isPending}
          projectsErrorMessage={projectsQuery.error ? getRequestErrorMessage(projectsQuery.error) : null}
          deleteErrorMessage={deleteProjectMutation.error ? getRequestErrorMessage(deleteProjectMutation.error) : null}
        />
      </main>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleProjectCreated}
      />

      <EditProjectDialog
        open={editProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog()
          }
        }}
        project={editProject}
        onUpdated={(project) => {
          if (lastOpened?.id === project.id) {
            setLastOpenedProject({ id: project.id, name: project.name })
            setLastOpened({ id: project.id, name: project.name })
          }
        }}
      />

      <CreateEndpointDialog
        open={endpointDialogProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEndpointDialogProject(null)
          }
        }}
        projectId={endpointDialogProject?.id ?? null}
        projectName={endpointDialogProject?.name}
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        entityName="Project"
        entityLabel={deleteTarget?.name}
        requireConfirmText={deleteTarget ? `sudo delete ${deleteTarget.name}` : undefined}
        warning={
          deleteTarget && deleteTarget.endpointCount > 0
            ? `This will also permanently delete ${deleteTarget.endpointCount} endpoint${deleteTarget.endpointCount === 1 ? "" : "s"} associated with this project.`
            : undefined
        }
        onConfirm={confirmDelete}
        isPending={deleteProjectMutation.isPending}
      />
    </div>
  )
}
