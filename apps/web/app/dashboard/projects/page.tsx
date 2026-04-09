"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, FolderKanban, LoaderCircle, Search } from "lucide-react"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useCreateProjectMutation } from "@/hooks/use-projects"
import { getRequestErrorMessage } from "@/lib/http"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

export default function DashboardProjectsPage() {
  const router = useRouter()
  const { projects, selectedProjectId, isLoading, errorMessage } = useDashboardProjectContext()
  const createProjectMutation = useCreateProjectMutation()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [projectName, setProjectName] = React.useState("")
  const [projectDescription, setProjectDescription] = React.useState("")

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
    router.push(`/dashboard?projectId=${encodeURIComponent(projectId)}`)
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
      router.push(`/dashboard?projectId=${encodeURIComponent(project.id)}`)
    } catch {
      // Mutation error message is shown below.
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Projects</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Centralized Project Workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Browse every project in one place. Open any project to jump directly into its dashboard scope.
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

          {errorMessage ? (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          {isLoading ? (
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading projects...
            </div>
          ) : null}

          {!isLoading && filteredProjects.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              No projects match your search.
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {filteredProjects.map((project) => {
              const isSelected = selectedProjectId === project.id

              return (
                <article
                  key={project.id}
                  className="rounded-xl border border-border bg-background/70 p-4 transition hover:border-primary/50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{project.name}</h3>
                        {isSelected ? <Badge variant="secondary">Current</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "No description yet. Add details to clarify this project's scope."}
                      </p>
                    </div>

                    <Button onClick={() => openProjectDashboard(project.id)} className="shrink-0">
                      Open Dashboard
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
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
          <p className="mt-2 text-sm text-muted-foreground">Spin up a new project and open its dashboard instantly.</p>

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

            <Button type="submit" className="w-full" disabled={createProjectMutation.isPending || !projectName.trim()}>
              {createProjectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {createProjectMutation.isPending ? "Creating..." : "Create and Open"}
            </Button>
          </form>
        </aside>
      </div>
    </section>
  )
}