"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointsQuery } from "@/hooks/use-endpoints"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Webhook } from "lucide-react"
import { EventsTable } from "@/components/events/events-table"

export default function EndpointEventsPage() {
  const routeParams = useParams<{ endpointId?: string }>()
  const endpointId =
    typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const { selectedProject } = useDashboardProjectContext()
  const endpointsQuery = useEndpointsQuery(selectedProject?.id ?? null)
  const endpoints = endpointsQuery.data?.data ?? []

  const endpoint = React.useMemo(
    () => endpoints.find((item) => item.id === endpointId) ?? null,
    [endpointId, endpoints]
  )

  return (
    <section className="space-y-6">
      <PageHeader
        label="Events"
        title={endpoint?.name ?? "Event Stream"}
        description="Inspect incoming webhook events. Search by event ID and narrow the table with backend filters for status and event type."
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {endpointId ? (
          <EventsTable endpointId={endpointId} />
        ) : (
          <EmptyState
            icon={Webhook}
            title="No endpoint selected"
            description="Select an endpoint from the sidebar to inspect its event stream."
          />
        )}
      </div>
    </section>
  )
}
