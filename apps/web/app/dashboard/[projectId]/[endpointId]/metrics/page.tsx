"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import { BarChart3, LoaderCircle } from "lucide-react"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointDetailQuery } from "@/hooks/use-endpoints"
import { useWebhookEventsQuery } from "@/hooks/use-webhook-events"

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </article>
  )
}

export default function EndpointMetricsPage() {
  const routeParams = useParams<{ projectId?: string; endpointId?: string }>()
  const projectId = typeof routeParams.projectId === "string" ? routeParams.projectId : null
  const endpointId = typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const { selectedProject } = useDashboardProjectContext()
  const endpointQuery = useEndpointDetailQuery(projectId, endpointId)
  const endpoint = endpointQuery.data

  // Fetch delivered and failed totals via separate status-filtered queries
  const deliveredQuery = useWebhookEventsQuery({
    endpointId: endpointId ?? undefined,
    page: 1,
    limit: 1,
    status: "DELIVERED",
  })
  const failedQuery = useWebhookEventsQuery({
    endpointId: endpointId ?? undefined,
    page: 1,
    limit: 1,
    status: "FAILED",
  })

  const totalEvents = endpoint?._count.events ?? 0
  const delivered = deliveredQuery.data?.pagination.total ?? 0
  const failed = failedQuery.data?.pagination.total ?? 0
  const successRate =
    totalEvents > 0 ? `${((delivered / totalEvents) * 100).toFixed(1)}%` : "—"

  const isLoading = endpointQuery.isLoading

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Metrics</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {endpoint?.name ?? selectedProject?.name ?? "Metrics"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Delivery success rates and event totals for this endpoint.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <article key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="mt-4 h-8 w-16 rounded bg-muted" />
            </article>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Received" value={totalEvents.toLocaleString()} />
          <StatCard label="Delivered" value={delivered.toLocaleString()} />
          <StatCard label="Failed" value={failed.toLocaleString()} />
          <StatCard label="Success Rate" value={successRate} />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Delivery Volume
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BarChart3 className="size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Charts coming soon</p>
          <p className="max-w-xs text-xs text-muted-foreground/70">
            Time-series delivery volume charts require an aggregation API endpoint.
          </p>
        </div>
      </div>
    </section>
  )
}
