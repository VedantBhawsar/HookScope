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
import type { ProjectRecord } from "@/hooks/use-projects"

interface ProjectsTableCardProps {
  projects: ProjectRecord[]
  allProjectsCount: number
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onCreateProject: () => void
  onOpenProject: (project: ProjectRecord) => void
  onEditProject: (project: ProjectRecord) => void
  onCreateEndpoint: (project: ProjectRecord) => void
  onDeleteProject: (projectId: string) => void
  isLoading: boolean
  isDeleting: boolean
  projectsErrorMessage: string | null
  deleteErrorMessage: string | null
}

function formatProjectCreatedDate(createdAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(createdAt))
}

export function ProjectsTableCard({
  projects,
  allProjectsCount,
  searchTerm,
  onSearchTermChange,
  onCreateProject,
  onOpenProject,
  onEditProject,
  onCreateEndpoint,
  onDeleteProject,
  isLoading,
  isDeleting,
  projectsErrorMessage,
  deleteErrorMessage,
}: ProjectsTableCardProps) {
  const hasProjects = projects.length > 0

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <p className="text-sm font-medium">Projects</p>
        <div className="ml-auto flex items-center gap-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
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

      {projectsErrorMessage ? <p className="px-5 py-3 text-sm text-destructive">{projectsErrorMessage}</p> : null}
      {deleteErrorMessage ? (
        <p className="border-b border-border px-5 py-2 text-sm text-destructive">{deleteErrorMessage}</p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading projects…
        </div>
      ) : null}

      {!isLoading && !hasProjects ? (
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
                        <DropdownMenuItem onSelect={() => onCreateEndpoint(project)}>
                          <Plus className="size-3.5" />
                          Create Endpoint
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onEditProject(project)}>
                          <Pencil className="size-3.5" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isDeleting}
                          className="text-destructive focus:text-destructive"
                          onSelect={() => onDeleteProject(project.id)}
                        >
                          {isDeleting ? (
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

      {hasProjects ? (
        <div className="border-t border-border px-5 py-2.5">
          <p className="text-xs text-muted-foreground">
            {projects.length === allProjectsCount
              ? `${allProjectsCount} project${allProjectsCount === 1 ? "" : "s"}`
              : `${projects.length} of ${allProjectsCount} projects`}
          </p>
        </div>
      ) : null}
    </div>
  )
}
