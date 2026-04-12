"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { LoaderCircle, Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { useEndpointsQuery } from "@/hooks/use-endpoints"
import { useProjectsQuery } from "@/hooks/use-projects"
import { CreateEndpointDialog } from "@/components/endpoints/create-endpoint-dialog"
import {
  getActiveEndpointForProject,
  setActiveEndpointForProject,
} from "@/lib/endpoint-selection"

export default function ProjectDashboardRedirectPage() {
  const router = useRouter()
  const routeParams = useParams<{ projectId?: string }>()
  const projectId =
    typeof routeParams.projectId === "string" ? routeParams.projectId : null

  const endpointsQuery = useEndpointsQuery(projectId)
  const projectsQuery = useProjectsQuery()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  // Tracks whether the dialog closed because an endpoint was created (vs. cancelled).
  const createdRef = React.useRef(false)

  // Redirect once a valid endpoint is resolved.
  React.useEffect(() => {
    if (!projectId) {
      router.replace("/projects")
      return
    }

    if (endpointsQuery.isLoading) return

    const endpoints = endpointsQuery.data?.data ?? []
    if (endpoints.length === 0) return

    const storedEndpoint = getActiveEndpointForProject(projectId)
    const preferredEndpoint = storedEndpoint
      ? endpoints.find((endpoint) => endpoint.id === storedEndpoint.id) ?? null
      : null
    const targetEndpoint = preferredEndpoint ?? endpoints[0]

    if (!targetEndpoint) return

    setActiveEndpointForProject(projectId, {
      id: targetEndpoint.id,
      name: targetEndpoint.name,
    })

    router.replace(`/dashboard/${projectId}/${targetEndpoint.id}`, {
      scroll: false,
    })
  }, [endpointsQuery.data?.data, endpointsQuery.isLoading, projectId, router])

  // Auto-open the creation dialog when the project has no endpoints.
  React.useEffect(() => {
    if (!endpointsQuery.isLoading && (endpointsQuery.data?.data ?? []).length === 0) {
      setDialogOpen(true)
    }
  }, [endpointsQuery.isLoading, endpointsQuery.data?.data])

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      if (createdRef.current) {
        // Endpoint was created — the query invalidation will trigger the redirect effect.
        createdRef.current = false
      } else {
        // User cancelled — send them back to the projects page.
        router.replace("/projects")
      }
    }
  }

  const handleCreated = () => {
    createdRef.current = true
  }

  if (!projectId || endpointsQuery.isLoading) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading endpoints...
        </div>
      </section>
    )
  }

  const endpoints = endpointsQuery.data?.data ?? []

  if (endpoints.length > 0) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Redirecting to endpoint dashboard...
        </div>
      </section>
    )
  }

  const projectName =
    projectsQuery.data?.data.find((p) => p.id === projectId)?.name

  return (
    <>
      <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Endpoint Required
          </p>
          <h1 className="text-2xl font-semibold">No endpoints yet</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first endpoint to start receiving webhooks on this project.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Create Endpoint
        </Button>
      </section>

      <CreateEndpointDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        projectId={projectId}
        projectName={projectName}
        onCreated={handleCreated}
      />
    </>
  )
}
