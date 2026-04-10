"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    ArrowRight,
  Clock,
  LoaderCircle,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { getRequestErrorMessage } from "@/lib/http"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useProjectsQuery,
  useUpdateProjectMutation,
  type ProjectRecord,
} from "@/hooks/use-projects"
import { CreateEndpointDialog } from "@/components/endpoints/create-endpoint-dialog"
import { ProjectsTopbar } from "@/components/projects/projects-topbar"
import { ProjectsTableCard } from "@/components/projects/projects-table-card"

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
  const createProjectMutation = useCreateProjectMutation()
  const updateProjectMutation = useUpdateProjectMutation()
  const deleteProjectMutation = useDeleteProjectMutation()
  const logoutMutation = useLogoutMutation()

  const [searchTerm, setSearchTerm] = React.useState("")

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false)
  const [projectName, setProjectName] = React.useState("")
  const [projectDescription, setProjectDescription] = React.useState("")

  // Edit dialog
  const [editProject, setEditProject] = React.useState<ProjectRecord | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")

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
    router.push(`/dashboard/${encodeURIComponent(project.id)}`)
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
    setProjectName("")
    setProjectDescription("")
    createProjectMutation.reset()
    setCreateOpen(true)
  }

  const onCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const project = await createProjectMutation.mutateAsync({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      })

      setCreateOpen(false)
      setProjectName("")
      setProjectDescription("")
      setLastOpenedProject({ id: project.id, name: project.name })
      router.push(`/dashboard/${encodeURIComponent(project.id)}`)
    } catch {
      //
    }
  }

  // Edit dialog handlers
  const openEditDialog = (project: ProjectRecord) => {
    setEditProject(project)
    setEditName(project.name)
    setEditDescription(project.description ?? "")
    updateProjectMutation.reset()
  }

  const closeEditDialog = () => {
    setEditProject(null)
    setEditName("")
    setEditDescription("")
  }

  const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editProject) return

    try {
      await updateProjectMutation.mutateAsync({
        id: editProject.id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })
      closeEditDialog()
    } catch {
      //
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      await deleteProjectMutation.mutateAsync(projectId)
      if (editProject?.id === projectId) closeEditDialog()
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
          onDeleteProject={deleteProject}
          isLoading={projectsQuery.isLoading}
          isDeleting={deleteProjectMutation.isPending}
          projectsErrorMessage={projectsQuery.error ? getRequestErrorMessage(projectsQuery.error) : null}
          deleteErrorMessage={deleteProjectMutation.error ? getRequestErrorMessage(deleteProjectMutation.error) : null}
        />
      </main>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form id="create-project-form" onSubmit={onCreateProject} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="create-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-name"
                required
                autoFocus
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Payments Webhooks"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-description" className="text-sm font-medium">
                Description
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="create-description"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="What is this project for?"
                rows={3}
                className="resize-none"
              />
            </div>
            {createProjectMutation.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getRequestErrorMessage(createProjectMutation.error)}
              </p>
            ) : null}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-project-form"
              disabled={createProjectMutation.isPending || !projectName.trim()}
            >
              {createProjectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {createProjectMutation.isPending ? "Creating…" : "Create & Open"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editProject !== null} onOpenChange={(open) => { if (!open) closeEditDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form id="edit-project-form" onSubmit={saveProject} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="edit-name"
                required
                autoFocus
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Project name"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Project description"
                rows={3}
                className="resize-none"
              />
            </div>
            {updateProjectMutation.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getRequestErrorMessage(updateProjectMutation.error)}
              </p>
            ) : null}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-project-form"
              disabled={updateProjectMutation.isPending || !editName.trim()}
            >
              {updateProjectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {updateProjectMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
