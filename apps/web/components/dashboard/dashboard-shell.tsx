"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import {
  BarChart3,
  Bell,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Settings,
  UserCircle,
  Webhook,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"
import { getRequestErrorMessage } from "@/lib/http"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import { useProjectsQuery } from "@/hooks/use-projects"
import { DashboardProjectProvider } from "@/components/dashboard/dashboard-project-context"
import { AvatarUploadDialog } from "@/components/dashboard/avatar-upload-dialog"

interface DashboardShellProps {
  children: React.ReactNode
}

const DASHBOARD_NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    label: "Events",
    href: "/dashboard/events",
    icon: Webhook,
  },
  {
    label: "Metrics",
    href: "/dashboard/metrics",
    icon: BarChart3,
  },
  {
    label: "Alerts",
    href: "/dashboard/alerts",
    icon: Bell,
  },
] as const

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const projectsQuery = useProjectsQuery()
  const [avatarUploadOpen, setAvatarUploadOpen] = React.useState(false)

  const projects = projectsQuery.data?.data ?? []
  const selectedProjectIdFromUrl = searchParams.get("projectId")
  const selectedProject = projects.find((project) => project.id === selectedProjectIdFromUrl) ?? null

  const setSelectedProjectId = React.useCallback(
    (projectId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("projectId", projectId)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  React.useEffect(() => {
    if (meQuery.isLoading) return

    const user = meQuery.data?.user

    if (!user) {
      router.replace("/auth/login")
      return
    }

    if (!user.onboarding?.onboardingCompleted) {
      router.replace("/onboarding?step=verify")
    }
  }, [meQuery.data?.user, meQuery.isLoading, router])

  React.useEffect(() => {
    if (projectsQuery.isLoading || projects.length === 0) return

    const hasSelection = Boolean(selectedProject)
    if (hasSelection) return

    const firstProject = projects[0]
    if (!firstProject) return

    setSelectedProjectId(firstProject.id)
  }, [projects, projectsQuery.isLoading, selectedProject, setSelectedProjectId])

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

  if (!user || !user.onboarding?.onboardingCompleted) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Redirecting...
        </div>
      </section>
    )
  }

  const projectContextValue = {
    projects,
    selectedProjectId: selectedProject?.id ?? null,
    selectedProject,
    setSelectedProjectId,
    isLoading: projectsQuery.isLoading,
    errorMessage: projectsQuery.error ? getRequestErrorMessage(projectsQuery.error) : null,
  }

  return (
    <DashboardProjectProvider value={projectContextValue}>
      <div className="min-h-screen bg-background">
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="hidden border-r border-border/70 bg-card/50 p-4 lg:flex lg:flex-col">
            <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Webhook</p>
              <h1 className="mt-1 font-heading text-lg font-semibold">Observability</h1>
            </div>

            <div className="mb-3 rounded-xl border border-border bg-card p-2.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Project</p>
              <Select
                value={selectedProject?.id ?? ""}
                onValueChange={setSelectedProjectId}
                disabled={projectsQuery.isLoading || projects.length === 0}
              >
                <SelectTrigger id="project-select" size="sm" className="mt-1.5 w-full" aria-label="Select project">
                  <SelectValue placeholder={projects.length === 0 ? "No projects found" : "Select a project"} />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectLabel>Projects</SelectLabel>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="mt-2 rounded-md bg-muted/20 px-2.5 py-2">
                <p className="truncate text-xs font-medium">{selectedProject?.name ?? "Select a project"}</p>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                  {selectedProject?.description || "Project-scoped dashboard metrics and events will appear below."}
                </p>
              </div>
            </div>

            <nav className="flex flex-1 flex-col gap-1">
              {DASHBOARD_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon
                const params = new URLSearchParams(searchParams.toString())
                if (selectedProject?.id) {
                  params.set("projectId", selectedProject.id)
                }
                const href = params.has("projectId") ? `${item.href}?${params.toString()}` : item.href

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="mt-4 h-auto w-full justify-start px-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </span>
                  <div className="grid min-w-0 flex-1 text-left">
                    <span className="truncate text-sm font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setAvatarUploadOpen(true)}>
                    <UserCircle data-icon="inline-start" />
                    Change photo
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings data-icon="inline-start" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      logoutMutation.mutate()
                    }}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <LogOut data-icon="inline-start" />}
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </aside>

          <div className="flex min-w-0 flex-col">
            <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
              <div className="mx-auto flex w-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dashboard</p>
                  <p className="truncate font-heading text-lg font-semibold">
                    {selectedProject?.name ?? `${user.name}'s Workspace`}
                  </p>
                </div>

                <ThemeToggle />
              </div>
              {projectsQuery.error ? (
                <p className="mx-auto mt-2 w-full text-xs text-destructive">
                  {getRequestErrorMessage(projectsQuery.error)}
                </p>
              ) : null}
              {logoutMutation.error ? (
                <p className="mx-auto mt-2 w-full text-xs text-destructive">
                  {getRequestErrorMessage(logoutMutation.error)}
                </p>
              ) : null}
            </header>

            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="mx-auto flex w-full flex-col gap-6">{children}</div>
            </main>
          </div>
        </div>
      </div>

      <AvatarUploadDialog
        open={avatarUploadOpen}
        onOpenChange={setAvatarUploadOpen}
        currentAvatarUrl={user.avatarUrl}
        userName={user.name}
      />
    </DashboardProjectProvider>
  )
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}