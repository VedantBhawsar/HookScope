"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import { Bell } from "lucide-react"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointsQuery } from "@/hooks/use-endpoints"

export default function EndpointAlertsPage() {
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
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Alerts
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {endpoint?.name ?? "Alerts"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Configure delivery failure notifications and threshold-based alert
          rules for this endpoint.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Bell className="size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No alerts configured
          </p>
          <p className="max-w-xs text-xs text-muted-foreground/70">
            Alert rules and notification channels will be manageable from here.
          </p>
        </div>
      </div>
    </section>
  )
}
