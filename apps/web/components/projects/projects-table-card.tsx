"use client"

import * as React from "react"
import {
  ArrowRight,
  FolderOpen,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination"
import { ConfirmDeleteDialog } from "@workspace/ui/components/confirm-delete-dialog"
import { toast } from "@workspace/ui/components/sonner"
import { useProjectsQuery, useDeleteProjectMutation, type ProjectRecord } from "@/hooks/use-projects"
import { getRequestErrorMessage, getRequestSuccessMessage } from "@/lib/http"
import { CreateEndpointDialog } from "@/components/endpoints/create-endpoint-dialog"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"

const PAGE_LIMIT = 10

interface ProjectsTableCardProps {
  onCreateProject: () => void
  onOpenProject: (project: ProjectRecord) => void
  onProjectUpdated?: (project: ProjectRecord) => void
}

function formatProjectCreatedDate(createdAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(createdAt))
}

export function ProjectsTableCard({
  onCreateProject,
  onOpenProject,
  onProjectUpdated,
}: ProjectsTableCardProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [editProject, setEditProject] = React.useState<ProjectRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectRecord | null>(null)
  const [endpointDialogProject, setEndpointDialogProject] = React.useState<ProjectRecord | null>(null)
  const deleteProjectMutation = useDeleteProjectMutation()

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchTerm])

  // Reset to page 1 whenever the debounced search term changes
  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearchTerm])

  const projectsQuery = useProjectsQuery({ page, limit: PAGE_LIMIT, search: debouncedSearchTerm })

  const projects = projectsQuery.data?.data ?? []
  const pagination = projectsQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 1
  const total = pagination?.total ?? 0
  const hasProjects = projects.length > 0
  const projectsErrorMessage = projectsQuery.error
    ? getRequestErrorMessage(projectsQuery.error)
    : null

  const closeEditDialog = () => setEditProject(null)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const response = await deleteProjectMutation.mutateAsync(deleteTarget.id)
      if (editProject?.id === deleteTarget.id) closeEditDialog()
      setDeleteTarget(null)
      toast.success(getRequestSuccessMessage(response))
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Projects</p>
          <div className="ml-auto flex items-center gap-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search…"
                className="h-8 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 focus:w-64"
              />
            </label>
            <Button size="sm" onClick={onCreateProject}>
              <Plus className="size-3.5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Inline error banner */}
        {projectsErrorMessage ? (
          <p className="px-5 py-3 text-sm text-destructive">{projectsErrorMessage}</p>
        ) : null}

        {/* Loading state */}
        {projectsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading projects…
          </div>
        ) : null}

        {/* Empty state */}
        {!projectsQuery.isLoading && !hasProjects ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
              <FolderOpen className="size-5 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium">{searchTerm ? "No results found" : "No projects yet"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {searchTerm ? "Try a different search term." : "Create your first project to get started."}
              </p>
            </div>
            {!searchTerm ? (
              <Button size="sm" onClick={onCreateProject}>
                <Plus className="size-3.5" />
                New Project
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Projects table */}
        {hasProjects ? (
          <Table>
            <TableHeader>
              <TableRow className="text-left">
                <TableHead className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="hidden px-5 py-2.5 text-xs font-medium text-muted-foreground sm:table-cell">
                  Description
                </TableHead>
                <TableHead className="hidden px-5 py-2.5 text-xs font-medium text-muted-foreground md:table-cell">
                  Created
                </TableHead>
                <TableHead className="px-5 py-2.5 text-xs font-medium text-muted-foreground">Endpoints</TableHead>
                <TableHead className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id} className="group transition-colors hover:bg-muted/30">
                  <TableCell className="px-5 py-3.5">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline hover:underline-offset-2 focus:outline-none"
                      onClick={() => onOpenProject(project)}
                    >
                      {project.name}
                    </button>
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate px-5 py-3.5 text-muted-foreground sm:table-cell">
                    {project.description ?? <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="hidden px-5 py-3.5 text-muted-foreground md:table-cell">
                    {formatProjectCreatedDate(project.createdAt)}
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    <Badge variant="secondary" className="text-xs">
                      {project.endpointCount} endpoint{project.endpointCount === 1 ? "" : "s"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Project actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => onOpenProject(project)}>
                            <ArrowRight className="size-3.5" />
                            Open Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEndpointDialogProject(project)}>
                            <Plus className="size-3.5" />
                            Create Endpoint
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEditProject(project)}>
                            <Pencil className="size-3.5" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={deleteProjectMutation.isPending}
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDeleteTarget(project)}
                          >
                            {deleteProjectMutation.isPending ? (
                              <LoaderCircle className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {/* Footer: count + pagination */}
        {hasProjects ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-2.5">
            <p className="text-xs text-muted-foreground">
              {total} project{total === 1 ? "" : "s"}
            </p>
            {totalPages > 1 ? (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-disabled={page === 1}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-2 text-xs text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-disabled={page === totalPages}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>
        ) : null}
      </div>

      <EditProjectDialog
        open={editProject !== null}
        onOpenChange={(open) => { if (!open) closeEditDialog() }}
        project={editProject}
        onUpdated={(project) => {
          onProjectUpdated?.(project)
        }}
      />

      <CreateEndpointDialog
        open={endpointDialogProject !== null}
        onOpenChange={(open) => { if (!open) setEndpointDialogProject(null) }}
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
    </>
  )
}
