"use client"

import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
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
import { useEndpointsQuery } from "@/hooks/use-endpoints"
import { useProjectsQuery } from "@/hooks/use-projects"
import { DashboardProjectProvider } from "@/components/dashboard/dashboard-project-context"
import { AvatarUploadDialog } from "@/components/dashboard/avatar-upload-dialog"
import {
  getActiveEndpointForProject,
  setActiveEndpointForProject,
  clearActiveEndpointForProject,
} from "@/lib/endpoint-selection"

interface DashboardShellProps {
  children: React.ReactNode
}

const DASHBOARD_NAV_ITEMS = [
  {
    label: "Overview",
    segment: "",
    absoluteHref: null,
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    segment: "",
    absoluteHref: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Events",
    segment: "/events",
    absoluteHref: null,
    icon: Webhook,
  },
  {
    label: "Metrics",
    segment: "/metrics",
    absoluteHref: null,
    icon: BarChart3,
  },
  {
    label: "Alerts",
    segment: "/alerts",
    absoluteHref: null,
    icon: Bell,
  },
] as const

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const routeParams = useParams<{ projectId?: string }>()
  const router = useRouter()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const projectsQuery = useProjectsQuery()
  const [avatarUploadOpen, setAvatarUploadOpen] = React.useState(false)

  const projects = projectsQuery.data?.data ?? []
  const selectedProjectIdFromUrl = typeof routeParams.projectId === "string" ? routeParams.projectId : null
  const selectedProject = projects.find((project) => project.id === selectedProjectIdFromUrl) ?? null
  const endpointsQuery = useEndpointsQuery(selectedProject?.id ?? null)
  const endpoints = endpointsQuery.data?.data ?? []
  const [selectedEndpointId, setSelectedEndpointId] = React.useState<string | null>(null)
  const canChangeEndpoint = pathname.startsWith("/projects")

  const setSelectedProjectId = React.useCallback(
    (projectId: string) => {
      router.replace(`/dashboard/${projectId}`, { scroll: false })
    },
    [router]
  )

  const setSelectedEndpointById = React.useCallback(
    (endpointId: string) => {
      if (!selectedProject?.id) return

      const endpoint = endpoints.find((item) => item.id === endpointId)
      if (!endpoint) return

      setSelectedEndpointId(endpoint.id)
      setActiveEndpointForProject(selectedProject.id, {
        id: endpoint.id,
        name: endpoint.name,
      })
    },
    [endpoints, selectedProject?.id]
  )

  const selectedEndpoint = endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null

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
    if (projectsQuery.isLoading) return

    if (selectedProject) return

    router.replace("/projects")
  }, [projectsQuery.isLoading, router, selectedProject])

  React.useEffect(() => {
    if (!selectedProject?.id) {
      setSelectedEndpointId(null)
      return
    }

    if (endpointsQuery.isLoading) return

    if (endpoints.length === 0) {
      clearActiveEndpointForProject(selectedProject.id)
      setSelectedEndpointId(null)
      return
    }

    const storedSelection = getActiveEndpointForProject(selectedProject.id)
    const storedEndpointExists = storedSelection
      ? endpoints.some((endpoint) => endpoint.id === storedSelection.id)
      : false

    if (storedSelection && storedEndpointExists) {
      setSelectedEndpointId(storedSelection.id)
      return
    }

    const fallbackEndpoint = endpoints[0]
    if (!fallbackEndpoint) {
      setSelectedEndpointId(null)
      return
    }

    setSelectedEndpointId(fallbackEndpoint.id)
    setActiveEndpointForProject(selectedProject.id, {
      id: fallbackEndpoint.id,
      name: fallbackEndpoint.name,
    })
  }, [endpoints, endpointsQuery.isLoading, selectedProject?.id])

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
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Endpoint</p>
              <Select
                value={selectedEndpoint?.id ?? ""}
                onValueChange={setSelectedEndpointById}
                disabled={!canChangeEndpoint || endpointsQuery.isLoading || endpoints.length === 0}
              >
                <SelectTrigger id="endpoint-select" size="sm" className="mt-1.5 w-full" aria-label="Select endpoint">
                  <SelectValue
                    placeholder={
                      endpointsQuery.isLoading
                        ? "Loading endpoints"
                        : endpoints.length === 0
                          ? "No endpoints found"
                          : "Select an endpoint"
                    }
                  />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectLabel>Endpoints</SelectLabel>
                    {endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.id} value={endpoint.id}>
                        {endpoint.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="mt-2 rounded-md bg-muted/20 px-2.5 py-2">
                <p className="truncate text-xs font-medium">{selectedEndpoint?.name ?? "No endpoint selected"}</p>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                  {selectedEndpoint
                    ? `${selectedEndpoint.source} · ${selectedEndpoint.status}`
                    : "Endpoint-scoped metrics and events will appear below."}
                </p>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Endpoint can be changed from Projects workspace.</p>
              {endpointsQuery.error ? (
                <p className="mt-1.5 text-[11px] text-destructive">
                  {getRequestErrorMessage(endpointsQuery.error)}
                </p>
              ) : null}
            </div>

            <nav className="flex flex-1 flex-col gap-1">
              {DASHBOARD_NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const href = item.absoluteHref
                  ? item.absoluteHref
                  : selectedProject?.id
                    ? `/dashboard/${selectedProject.id}${item.segment}`
                    : "/projects"
                const isActive = pathname === href || pathname.startsWith(`${href}/`)

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