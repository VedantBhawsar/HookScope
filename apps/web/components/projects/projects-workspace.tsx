"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, FolderKanban, LoaderCircle, Pencil, Search, Trash2 } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { getRequestErrorMessage } from "@/lib/http"
import { useMeQuery } from "@/hooks/use-auth"
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useProjectsQuery,
  useUpdateProjectMutation,
  type ProjectRecord,
} from "@/hooks/use-projects"

export function ProjectsWorkspace() {
  const router = useRouter()
  const meQuery = useMeQuery()
  const projectsQuery = useProjectsQuery()
  const createProjectMutation = useCreateProjectMutation()
  const updateProjectMutation = useUpdateProjectMutation()
  const deleteProjectMutation = useDeleteProjectMutation()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [projectName, setProjectName] = React.useState("")
  const [projectDescription, setProjectDescription] = React.useState("")
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")

  const projects = projectsQuery.data?.data ?? []
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

  const openProjectDashboard = (projectId: string) => {
    router.push(`/dashboard/${encodeURIComponent(projectId)}`)
  }

  const onCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const project = await createProjectMutation.mutateAsync({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      })

      setProjectName("")
      setProjectDescription("")
      router.push(`/dashboard/${encodeURIComponent(project.id)}`)
    } catch {
      // Mutation error message is shown below.
    }
  }

  const startEditing = (project: ProjectRecord) => {
    setEditingProjectId(project.id)
    setEditName(project.name)
    setEditDescription(project.description ?? "")
  }

  const cancelEditing = () => {
    setEditingProjectId(null)
    setEditName("")
    setEditDescription("")
  }

  const saveProject = async (projectId: string) => {
    try {
      await updateProjectMutation.mutateAsync({
        id: projectId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      })
      cancelEditing()
    } catch {
      // Mutation error message is shown below.
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      await deleteProjectMutation.mutateAsync(projectId)
      if (editingProjectId === projectId) {
        cancelEditing()
      }
    } catch {
      // Mutation error message is shown below.
    }
  }

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

  return (
    <section className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Projects</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Project Operations Workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage your projects in one place, then open any project dashboard with a route-based context.
          </p>
        </header>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-xl font-semibold">All Projects</h2>
                <p className="text-sm text-muted-foreground">{projects.length} total projects</p>
              </div>
              <label className="relative block w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name or description"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
              </label>
            </div>

            {projectsQuery.error ? (
              <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getRequestErrorMessage(projectsQuery.error)}
              </p>
            ) : null}

            {projectsQuery.isLoading ? (
              <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading projects...
              </div>
            ) : null}

            {!projectsQuery.isLoading && filteredProjects.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                No projects match your search.
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {filteredProjects.map((project) => {
                const isEditing = editingProjectId === project.id

                return (
                  <article
                    key={project.id}
                    className="rounded-xl border border-border bg-background/70 p-4 transition hover:border-primary/50"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                          placeholder="Project name"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                          placeholder="Project description"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            onClick={() => saveProject(project.id)}
                            disabled={updateProjectMutation.isPending || !editName.trim()}
                          >
                            {updateProjectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                            Save
                          </Button>
                          <Button type="button" variant="outline" onClick={cancelEditing}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-base font-semibold">{project.name}</h3>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {project.description || "No description yet. Add details to clarify this project's scope."}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" onClick={() => startEditing(project)}>
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                          <Button type="button" variant="outline" onClick={() => deleteProject(project.id)}>
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                          <Button onClick={() => openProjectDashboard(project.id)} className="shrink-0">
                            Open Dashboard
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </article>

          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-muted-foreground" />
              <h2 className="font-heading text-xl font-semibold">Create Project</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a new project and jump straight into its dashboard.
            </p>

            <form className="mt-4 space-y-3" onSubmit={onCreateProject}>
              <div className="space-y-1.5">
                <label htmlFor="project-name" className="text-sm font-medium text-foreground">
                  Project name
                </label>
                <input
                  id="project-name"
                  required
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Payments Webhooks"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="project-description" className="text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="Track Stripe and GitHub events"
                  rows={4}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
              </div>

              {createProjectMutation.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {getRequestErrorMessage(createProjectMutation.error)}
                </p>
              ) : null}

              {updateProjectMutation.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {getRequestErrorMessage(updateProjectMutation.error)}
                </p>
              ) : null}

              {deleteProjectMutation.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {getRequestErrorMessage(deleteProjectMutation.error)}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={createProjectMutation.isPending || !projectName.trim()}
              >
                {createProjectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {createProjectMutation.isPending ? "Creating..." : "Create and Open"}
              </Button>
            </form>
          </aside>
        </div>
      </div>
    </section>
  )
}
