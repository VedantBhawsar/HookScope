"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { EndpointSettingsForm } from "@/components/endpoints/endpoint-settings-form"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointDetailQuery } from "@/hooks/use-endpoints"
import { PageHeader } from "@/components/layout/page-header"
import { SectionLabel } from "@/components/layout/section-label"

export default function EndpointSettingsPage() {
  const routeParams = useParams<{ endpointId?: string }>()
  const endpointId =
    typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const { selectedProject } = useDashboardProjectContext()
  const projectId = selectedProject?.id ?? null
  const endpointQuery = useEndpointDetailQuery(projectId, endpointId)
  const endpoint = endpointQuery.data ?? null

  if (endpointQuery.isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading endpoint settings...
        </div>
      </section>
    )
  }

  if (!endpoint) {
    return (
      <section className="space-y-6">
        <PageHeader
          label="Endpoint Settings"
          title="Endpoint not found"
          description="Select a valid endpoint from the sidebar to view and manage its settings."
        />
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader
        label="Endpoint Settings"
        title={endpoint.name}
        description="Configure and verify endpoint-level delivery behavior for this webhook destination."
      />

      <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <SectionLabel>General</SectionLabel>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-medium">{endpoint.source}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{endpoint.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created At</dt>
            <dd className="font-medium">{new Date(endpoint.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Received Events</dt>
            <dd className="font-medium">{endpoint._count.events}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Pause or resume delivery from the overview page. Verification mode and destination are editable below.
        </p>
      </article>

      {projectId ? <EndpointSettingsForm projectId={projectId} endpoint={endpoint} /> : null}
    </section>
  )
}
