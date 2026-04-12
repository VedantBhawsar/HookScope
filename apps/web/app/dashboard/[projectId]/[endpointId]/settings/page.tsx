"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { EndpointSettingsForm } from "@/components/endpoints/endpoint-settings-form"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointDetailQuery } from "@/hooks/use-endpoints"

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
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading endpoint settings...
        </div>
      </section>
    )
  }

  if (!endpoint) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Endpoint Settings
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold">Endpoint not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a valid endpoint from the sidebar to view and manage its settings.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Endpoint Settings
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold">{endpoint.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure and verify endpoint-level delivery behavior for this webhook destination.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">General</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium">{endpoint.source}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{endpoint.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Verification Mode</dt>
              <dd className="font-medium">{endpoint.verificationMode}</dd>
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
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Destination</p>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Destination URL</p>
            <p className="break-all rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
              {endpoint.destinationUrl}
            </p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Use the form below to edit and save endpoint configuration.</p>
        </article>
      </div>

      {projectId ? <EndpointSettingsForm projectId={projectId} endpoint={endpoint} /> : null}
    </section>
  )
}
