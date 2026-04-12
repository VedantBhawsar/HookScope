"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import { BarChart3 } from "lucide-react"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointsQuery } from "@/hooks/use-endpoints"

export default function EndpointMetricsPage() {
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
          Metrics
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {endpoint?.name ?? "Metrics"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Delivery success rates, latency distributions, and retry trends for
          this endpoint.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            "Total Received",
            "Delivered",
            "Failed",
            "Avg Latency",
          ] as const
        ).map((label) => (
          <article
            key={label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <div className="mt-4 h-8 w-24 rounded-md bg-muted" />
            <div className="mt-3 h-3 w-20 rounded-md bg-muted/70" />
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Delivery Volume
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BarChart3 className="size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No data yet
          </p>
          <p className="max-w-xs text-xs text-muted-foreground/70">
            Charts will populate once events start flowing through this endpoint.
          </p>
        </div>
      </div>
    </section>
  )
}
