"use client"

import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { getRequestErrorMessage } from "@/lib/http"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import { useEndpointsQuery } from "@/hooks/use-endpoints"
import { useProjectsQuery } from "@/hooks/use-projects"
import { DashboardProjectProvider } from "@/components/dashboard/dashboard-project-context"
import { AvatarUploadDialog } from "@/components/dashboard/avatar-upload-dialog"
import { CreateEndpointDialog } from "@/components/endpoints/create-endpoint-dialog"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import {
  getActiveEndpointForProject,
  setActiveEndpointForProject,
  clearActiveEndpointForProject,
} from "@/lib/endpoint-selection"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const routeParams = useParams<{ projectId?: string; endpointId?: string }>()
  const router = useRouter()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const projectsQuery = useProjectsQuery()
  const [avatarUploadOpen, setAvatarUploadOpen] = React.useState(false)
  const [endpointDialogOpen, setEndpointDialogOpen] = React.useState(false)

  const projects = projectsQuery.data?.data ?? []
  const selectedProjectIdFromUrl =
    typeof routeParams.projectId === "string" ? routeParams.projectId : null
  const selectedEndpointIdFromUrl =
    typeof routeParams.endpointId === "string" ? routeParams.endpointId : null
  const selectedProject =
    projects.find((project) => project.id === selectedProjectIdFromUrl) ?? null
  const endpointsQuery = useEndpointsQuery(selectedProject?.id ?? null)
  const endpoints = endpointsQuery.data?.data ?? []
  const [selectedEndpointId, setSelectedEndpointId] = React.useState<
    string | null
  >(null)

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

    if (selectedEndpointIdFromUrl) {
      const endpointFromUrl = endpoints.find(
        (endpoint) => endpoint.id === selectedEndpointIdFromUrl
      )

      if (endpointFromUrl) {
        setSelectedEndpointId(endpointFromUrl.id)
        setActiveEndpointForProject(selectedProject.id, {
          id: endpointFromUrl.id,
          name: endpointFromUrl.name,
        })
        return
      }
    }

    const storedSelection = getActiveEndpointForProject(selectedProject.id)
    const storedEndpointExists = storedSelection
      ? endpoints.some((endpoint) => endpoint.id === storedSelection.id)
      : false

    if (storedSelection && storedEndpointExists) {
      setSelectedEndpointId(storedSelection.id)
      router.replace(`/dashboard/${selectedProject.id}/${storedSelection.id}`, {
        scroll: false,
      })
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
    router.replace(`/dashboard/${selectedProject.id}/${fallbackEndpoint.id}`, {
      scroll: false,
    })
  }, [
    endpoints,
    endpointsQuery.isLoading,
    router,
    selectedEndpointIdFromUrl,
    selectedProject?.id,
  ])

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
    errorMessage: projectsQuery.error
      ? getRequestErrorMessage(projectsQuery.error)
      : null,
  }

  return (
    <DashboardProjectProvider value={projectContextValue}>
      <div className="min-h-screen bg-background lg:h-screen lg:overflow-hidden">
        <div className="grid min-h-screen grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[260px_1fr]">
          <DashboardSidebar
            user={user}
            selectedProject={selectedProject}
            endpoints={endpoints}
            selectedEndpointId={selectedEndpointId}
            isLoadingEndpoints={endpointsQuery.isLoading}
            endpointsErrorMessage={
              endpointsQuery.error
                ? getRequestErrorMessage(endpointsQuery.error)
                : null
            }
            onSelectEndpoint={handleSelectEndpoint}
            onCreateEndpoint={() => setEndpointDialogOpen(true)}
            onOpenAvatarUpload={() => setAvatarUploadOpen(true)}
            onLogout={() => logoutMutation.mutate()}
            isLogoutPending={logoutMutation.isPending}
          />

          <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <DashboardHeader
              title={selectedProject?.name ?? `${user.name}'s Workspace`}
              projectsErrorMessage={
                projectsQuery.error
                  ? getRequestErrorMessage(projectsQuery.error)
                  : null
              }
              logoutErrorMessage={
                logoutMutation.error
                  ? getRequestErrorMessage(logoutMutation.error)
                  : null
              }
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="mx-auto flex w-full flex-col gap-6">
                {children}
              </div>
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

      <CreateEndpointDialog
        open={endpointDialogOpen}
        onOpenChange={setEndpointDialogOpen}
        projectId={selectedProject?.id ?? null}
        projectName={selectedProject?.name}
      />
    </DashboardProjectProvider>
  )
}
