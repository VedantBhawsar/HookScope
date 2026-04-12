"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointsQuery } from "@/hooks/use-endpoints"
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
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Events</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {endpoint?.name ?? "Event Stream"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Inspect incoming webhook events. Filter by status or search by event ID and type.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {endpointId ? (
          <EventsTable endpointId={endpointId} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No endpoint selected.
          </p>
        )}
      </div>
    </section>
  )
}
