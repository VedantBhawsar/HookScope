"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { useEndpointsQuery } from "@/hooks/use-endpoints"
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
    const fallbackEndpoint = endpoints[0]
    const targetEndpoint = preferredEndpoint ?? fallbackEndpoint

    if (!targetEndpoint) return

    setActiveEndpointForProject(projectId, {
      id: targetEndpoint.id,
      name: targetEndpoint.name,
    })

    router.replace(`/dashboard/${projectId}/${targetEndpoint.id}`, {
      scroll: false,
    })
  }, [endpointsQuery.data?.data, endpointsQuery.isLoading, projectId, router])

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

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Endpoint Required
      </p>
      <h1 className="font-heading text-2xl font-semibold">No endpoints found for this project</h1>
      <p className="text-sm text-muted-foreground">
        Create an endpoint from the sidebar to open a scoped dashboard URL.
      </p>
      {endpointsQuery.error ? (
        <p className="text-sm text-destructive">Unable to load endpoints right now.</p>
      ) : null}
    </section>
  )
}
