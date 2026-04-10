"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ChevronDown,
  Clock,
  FolderOpen,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  Webhook,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { getRequestErrorMessage } from "@/lib/http"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useProjectsQuery,
  useUpdateProjectMutation,
  type ProjectRecord,
} from "@/hooks/use-projects"
import { ThemeToggle } from "@/components/theme-toggle"
import { CreateEndpointDialog } from "@/components/endpoints/create-endpoint-dialog"

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

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
      {initials}
    </span>
  )
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
      {/* ── Top navigation bar ── */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <Webhook className="size-4 text-primary-foreground" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">HookBase</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side controls */}
        <ThemeToggle />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted focus:outline-none"
              >
                <UserAvatar name={user.name} />
                <span className="hidden max-w-35 truncate font-medium sm:block">{user.name}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium leading-none">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onSelect={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

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

        {/* ── Projects table card ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Projects</p>
            <div className="ml-auto flex items-center gap-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search…"
                  className="h-8 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 focus:w-64"
                />
              </label>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="size-3.5" />
                New Project
              </Button>
            </div>
          </div>

          {/* Error states */}
          {projectsQuery.error ? (
            <p className="px-5 py-3 text-sm text-destructive">
              {getRequestErrorMessage(projectsQuery.error)}
            </p>
          ) : null}
          {deleteProjectMutation.error ? (
            <p className="border-b border-border px-5 py-2 text-sm text-destructive">
              {getRequestErrorMessage(deleteProjectMutation.error)}
            </p>
          ) : null}

          {/* Loading */}
          {projectsQuery.isLoading ? (
            <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading projects…
            </div>
          ) : null}

          {/* Empty state */}
          {!projectsQuery.isLoading && filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                <FolderOpen className="size-5 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {searchTerm ? "No results found" : "No projects yet"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {searchTerm
                    ? "Try a different search term."
                    : "Create your first project to get started."}
                </p>
              </div>
              {!searchTerm ? (
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="size-3.5" />
                  New Project
                </Button>
              ) : null}
            </div>
          ) : null}

          {/* Table */}
          {filteredProjects.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="hidden px-5 py-2.5 text-xs font-medium text-muted-foreground sm:table-cell">
                    Description
                  </th>
                  <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="group transition-colors hover:bg-muted/30"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        className="text-left font-medium hover:underline hover:underline-offset-2 focus:outline-none"
                        onClick={() => openProjectDashboard(project)}
                      >
                        {project.name}
                      </button>
                    </td>
                    <td className="hidden max-w-xs truncate px-5 py-3.5 text-muted-foreground sm:table-cell">
                      {project.description ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEditDialog(project)}
                        >
                          <Pencil className="size-3" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          disabled={deleteProjectMutation.isPending}
                          onClick={() => deleteProject(project.id)}
                        >
                          {deleteProjectMutation.isPending ? (
                            <LoaderCircle className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => setEndpointDialogProject(project)}
                        >
                          Create Endpoint
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => openProjectDashboard(project)}
                        >
                          Open
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {/* Footer count */}
          {filteredProjects.length > 0 ? (
            <div className="border-t border-border px-5 py-2.5">
              <p className="text-xs text-muted-foreground">
                {filteredProjects.length === projects.length
                  ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
                  : `${filteredProjects.length} of ${projects.length} projects`}
              </p>
            </div>
          ) : null}
        </div>
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
              <input
                id="create-name"
                required
                autoFocus
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Payments Webhooks"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-description" className="text-sm font-medium">
                Description
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="create-description"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="What is this project for?"
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
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
              <input
                id="edit-name"
                required
                autoFocus
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Project name"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Project description"
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
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
