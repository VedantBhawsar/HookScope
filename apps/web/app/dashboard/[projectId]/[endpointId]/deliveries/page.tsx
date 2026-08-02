"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Activity } from "lucide-react"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointDetailQuery } from "@/hooks/use-endpoints"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
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
      <PageHeader
        label="Deliveries"
        title={endpoint?.name ?? selectedProject?.name ?? "Deliveries"}
        description="Browse raw delivery attempts for this endpoint."
      />

      {/* ── Deliveries table ── */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {projectId && endpointId ? (
          <DeliveriesTable projectId={projectId} endpointId={endpointId} />
        ) : (
          <EmptyState
            icon={Activity}
            title="No endpoint selected"
            description="Select an endpoint from the sidebar to inspect its delivery attempts."
          />
        )}
      </div>
    </section>
  )
}
