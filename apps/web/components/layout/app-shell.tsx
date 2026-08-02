"use client"

import { useParams, usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { getRequestErrorMessage } from "@/lib/http"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import { useEndpointsQuery } from "@/hooks/use-endpoints"
import { useProjectsQuery } from "@/hooks/use-projects"
import { DashboardProjectProvider } from "@/components/dashboard/dashboard-project-context"
import { AvatarUploadDialog } from "@/components/dashboard/avatar-upload-dialog"
import { CreateEndpointDialog } from "@/components/endpoints/create-endpoint-dialog"
import { DashboardSidebar, type SidebarProps } from "@/components/dashboard/dashboard-sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ShellHeader, type BreadcrumbItem } from "@/components/layout/shell-header"
import { CommandPalette } from "@/components/command-palette"
import {
  getActiveEndpointForProject,
  setActiveEndpointForProject,
  clearActiveEndpointForProject,
} from "@/lib/endpoint-selection"

const PAGE_LABELS: Record<string, string> = {
  events: "Events",
  deliveries: "Deliveries",
  alerts: "Alerts",
  settings: "Settings",
}

interface AppShellProps {
  children: React.ReactNode
  pageTitle?: string
  pageLabel?: string
}

export function AppShell({ children, pageTitle, pageLabel }: AppShellProps) {
  const pathname = usePathname()
  const routeParams = useParams<{ projectId?: string; endpointId?: string }>()
  const router = useRouter()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const projectsQuery = useProjectsQuery()

  const [avatarUploadOpen, setAvatarUploadOpen] = React.useState(false)
  const [endpointDialogOpen, setEndpointDialogOpen] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)

  const isDashboard = pathname.startsWith("/dashboard")

  const projects = React.useMemo(() => projectsQuery.data?.data ?? [], [projectsQuery.data])
  const selectedProjectIdFromUrl =
    isDashboard && typeof routeParams.projectId === "string"
      ? routeParams.projectId
      : null
  const selectedProject = React.useMemo(
    () =>
      selectedProjectIdFromUrl
        ? projects.find((project) => project.id === selectedProjectIdFromUrl) ?? null
        : null,
    [projects, selectedProjectIdFromUrl]
  )
  const endpointsQuery = useEndpointsQuery(isDashboard ? selectedProjectIdFromUrl : null)
  const endpoints = React.useMemo(
    () => endpointsQuery.data?.data ?? [],
    [endpointsQuery.data]
  )
  const [selectedEndpointId, setSelectedEndpointId] = React.useState<string | null>(null)

  const selectedEndpoint = React.useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId]
  )
  const selectedEndpointName = selectedEndpoint?.name ?? null

  // ── Breadcrumb trail ──
  const crumbs = React.useMemo<BreadcrumbItem[]>(() => {
    if (!isDashboard) {
      const items: BreadcrumbItem[] = []
      if (pageLabel) items.push({ label: pageLabel })
      if (pageTitle) items.push({ label: pageTitle })
      return items
    }

    const dashboardSegments = pathname.split("/").filter(Boolean)
    const pageSegment = dashboardSegments.length >= 4 ? (dashboardSegments[3] ?? "") : ""
    const pageLabelFromSegment = PAGE_LABELS[pageSegment] ?? ""

    const items: BreadcrumbItem[] = [{ label: "Projects", href: "/projects" }]

    if (selectedProject) {
      items.push({
        label: selectedProject.name,
        href: `/dashboard/${selectedProject.id}`,
      })
    }

    if (selectedProjectIdFromUrl && selectedEndpointName && selectedEndpoint) {
      items.push({
        label: selectedEndpointName,
        href: `/dashboard/${selectedProjectIdFromUrl}/${selectedEndpoint.id}`,
      })
    }

    if (pageLabelFromSegment) {
      items.push({ label: pageLabelFromSegment })
    }

    return items
  }, [
    isDashboard,
    pageLabel,
    pageTitle,
    pathname,
    selectedEndpoint,
    selectedEndpointName,
    selectedProject,
    selectedProjectIdFromUrl,
  ])

  // ── Auth + onboarding + subscription gate ──
  React.useEffect(() => {
    if (meQuery.isLoading) return
    const user = meQuery.data?.user
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (!user.onboarding?.onboardingCompleted) {
      router.replace("/onboarding?step=verify")
      return
    }
    const sub = user.subscription
    const isActive = sub?.status === "ACTIVE" || sub?.status === "TRIALING"
    if (!isActive) {
      router.replace("/pricing")
    }
  }, [meQuery.data?.user, meQuery.isLoading, router])

  // ── Dashboard: redirect back to projects when the project doesn't exist ──
  React.useEffect(() => {
    if (!isDashboard) return
    if (projectsQuery.isLoading) return
    if (selectedProject) return
    router.replace("/projects")
  }, [isDashboard, projectsQuery.isLoading, router, selectedProject])

  // ── Dashboard: resolve the active endpoint for the selected project ──
  React.useEffect(() => {
    if (!isDashboard || !selectedProjectIdFromUrl) {
      setSelectedEndpointId(null)
      return
    }

    if (endpointsQuery.isLoading) return

    if (endpoints.length === 0) {
      clearActiveEndpointForProject(selectedProjectIdFromUrl)
      setSelectedEndpointId(null)
      return
    }

    const selectedEndpointIdFromUrl =
      typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

    if (selectedEndpointIdFromUrl) {
      const endpointFromUrl = endpoints.find(
        (endpoint) => endpoint.id === selectedEndpointIdFromUrl
      )
      if (endpointFromUrl) {
        setSelectedEndpointId(endpointFromUrl.id)
        setActiveEndpointForProject(selectedProjectIdFromUrl, {
          id: endpointFromUrl.id,
          name: endpointFromUrl.name,
        })
        return
      }
    }

    const storedSelection = getActiveEndpointForProject(selectedProjectIdFromUrl)
    const storedEndpointExists = storedSelection
      ? endpoints.some((endpoint) => endpoint.id === storedSelection.id)
      : false

    if (storedSelection && storedEndpointExists) {
      setSelectedEndpointId(storedSelection.id)
      router.replace(
        `/dashboard/${selectedProjectIdFromUrl}/${storedSelection.id}`,
        { scroll: false }
      )
      return
    }

    const fallbackEndpoint = endpoints[0]
    if (!fallbackEndpoint) {
      setSelectedEndpointId(null)
      return
    }

    setSelectedEndpointId(fallbackEndpoint.id)
    setActiveEndpointForProject(selectedProjectIdFromUrl, {
      id: fallbackEndpoint.id,
      name: fallbackEndpoint.name,
    })
    router.replace(`/dashboard/${selectedProjectIdFromUrl}/${fallbackEndpoint.id}`, {
      scroll: false,
    })
  }, [
    endpoints,
    endpointsQuery.isLoading,
    isDashboard,
    routeParams.endpointId,
    router,
    selectedProjectIdFromUrl,
  ])

  // ── Global ⌘K command palette ──
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const setSelectedProjectId = React.useCallback(
    (projectId: string) => {
      const preferredEndpoint = getActiveEndpointForProject(projectId)
      const fallbackEndpoint = endpoints[0]
      const targetEndpointId = preferredEndpoint?.id ?? fallbackEndpoint?.id

      if (targetEndpointId) {
        router.replace(`/dashboard/${projectId}/${targetEndpointId}`, {
          scroll: false,
        })
        return
      }

      router.replace(`/dashboard/${projectId}`, { scroll: false })
    },
    [endpoints, router]
  )

  const handleSelectEndpoint = React.useCallback(
    (endpointId: string) => {
      if (!selectedProject?.id) return

      const endpoint = endpoints.find((item) => item.id === endpointId)
      if (!endpoint) return

      setSelectedEndpointId(endpoint.id)
      setActiveEndpointForProject(selectedProject.id, {
        id: endpoint.id,
        name: endpoint.name,
      })
      router.replace(`/dashboard/${selectedProject.id}/${endpoint.id}`, {
        scroll: false,
      })
    },
    [endpoints, router, selectedProject?.id]
  )

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
  const sub = user?.subscription
  const isSubActive = sub?.status === "ACTIVE" || sub?.status === "TRIALING"

  if (!user || !user.onboarding?.onboardingCompleted || !isSubActive) {
    return (
      <section className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Redirecting...
        </div>
      </section>
    )
  }

  // ── Breadcrumb trail ──
  const sidebarProps: SidebarProps = isDashboard
    ? {
        mode: "dashboard",
        user,
        selectedProject,
        endpoints,
        selectedEndpointId,
        isLoadingEndpoints: endpointsQuery.isLoading,
        endpointsErrorMessage: endpointsQuery.error
          ? getRequestErrorMessage(endpointsQuery.error)
          : null,
        onSelectProject: setSelectedProjectId,
        onSelectEndpoint: handleSelectEndpoint,
        onCreateEndpoint: () => setEndpointDialogOpen(true),
        onOpenAvatarUpload: () => setAvatarUploadOpen(true),
        onLogout: () => logoutMutation.mutate(),
        isLogoutPending: logoutMutation.isPending,
      }
    : {
        user,
        onOpenAvatarUpload: () => setAvatarUploadOpen(true),
        onLogout: () => logoutMutation.mutate(),
        isLogoutPending: logoutMutation.isPending,
      }

  const content = (
    <div className="min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[260px_1fr]">
        <DashboardSidebar {...sidebarProps} />

        <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <ShellHeader
            crumbs={crumbs}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      <AvatarUploadDialog
        open={avatarUploadOpen}
        onOpenChange={setAvatarUploadOpen}
        currentAvatarUrl={user.avatarUrl}
        userName={user.name}
      />

      {isDashboard ? (
        <CreateEndpointDialog
          open={endpointDialogOpen}
          onOpenChange={setEndpointDialogOpen}
          projectId={selectedProject?.id ?? null}
          projectName={selectedProject?.name}
        />
      ) : null}

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        {...sidebarProps}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  )

  if (!isDashboard) return content

  const projectContextValue = {
    projects,
    selectedProjectId: selectedProject?.id ?? null,
    selectedProject,
    setSelectedProjectId,
    isLoading: projectsQuery.isLoading,
    errorMessage: projectsQuery.error
      ? getRequestErrorMessage(projectsQuery.error)
      : null,
  }

  return (
    <DashboardProjectProvider value={projectContextValue}>
      {content}
    </DashboardProjectProvider>
  )
}
