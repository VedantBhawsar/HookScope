"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointDetailQuery } from "@/hooks/use-endpoints"
import { DeliveriesTable } from "@/components/deliveries/deliveries-table"

export default function EndpointDeliveriesPage() {
  const routeParams = useParams<{ projectId?: string; endpointId?: string }>()
  const projectId = typeof routeParams.projectId === "string" ? routeParams.projectId : null
  const endpointId = typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const { selectedProject } = useDashboardProjectContext()
  const endpointQuery = useEndpointDetailQuery(projectId, endpointId)

  const endpoint = endpointQuery.data

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deliveries</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {endpoint?.name ?? selectedProject?.name ?? "Deliveries"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Browse raw delivery attempts for this endpoint.
        </p>
      </header>

      {/* ── Deliveries table ── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {projectId && endpointId ? (
          <DeliveriesTable projectId={projectId} endpointId={endpointId} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No endpoint selected.</p>
        )}
      </div>
    </section>
  )
}
