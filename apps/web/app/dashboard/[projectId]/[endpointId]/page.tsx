"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { LoaderCircle, PauseCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { EndpointStatsCards } from "@/components/overview/endpoint-stats-cards"
import { DeliveryMetricsCards } from "@/components/overview/delivery-metrics-cards"
import { DeliveryInsightsCharts } from "@/components/overview/delivery-insights-charts"
import { EventStatusChart } from "@/components/overview/event-status-chart"
import { EventVolumeChart } from "@/components/overview/event-volume-chart"
import { LiveEventFeed } from "@/components/overview/live-event-feed"
import {
  useEndpointDetailQuery,
  useToggleEndpointStatusMutation,
} from "@/hooks/use-endpoints"
import { getRequestErrorMessage } from "@/lib/http"

export default function ProjectDashboardPage() {
  const { selectedProject, isLoading: projectLoading } = useDashboardProjectContext()
  const routeParams = useParams<{ projectId?: string; endpointId?: string }>()
  const projectId = typeof routeParams.projectId === "string" ? routeParams.projectId : null
  const endpointId = typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const endpointQuery = useEndpointDetailQuery(projectId, endpointId)
  const endpoint = endpointQuery.data
  const toggleStatus = useToggleEndpointStatusMutation()

  async function handleToggleStatus() {
    if (!projectId || !endpointId || !endpoint) return
    const next = endpoint.status === "active" ? "paused" : "active"
    try {
      const { message } = await toggleStatus.mutateAsync({ projectId, endpointId, status: next })
      toast.success(message ?? `Endpoint ${next.toLowerCase()}`)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  if (projectLoading && !selectedProject) {
    return (
      <section className="space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="mt-3 h-8 w-56 rounded-lg bg-muted" />
        </header>
      </section>
    )
  }

  if (!selectedProject) {
    return (
      <section className="space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Project not found</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Return to the project workspace and select another project.
          </p>
        </header>
      </section>
    )
  }

  if (!projectId || !endpointId) return null

  const isActive = endpoint?.status === "active"

  return (
    <section className="space-y-6">
      {/* ── Header ── */}
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold">
              {endpointQuery.isLoading ? (
                <span className="inline-block h-8 w-48 animate-pulse rounded-lg bg-muted" />
              ) : (
                endpoint?.name ?? selectedProject.name
              )}
            </h1>
            {endpoint && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {endpoint.destinationUrl}
              </p>
            )}
          </div>
          {endpoint && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={toggleStatus.isPending}
              className="shrink-0"
            >
              {toggleStatus.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : isActive ? (
                <PauseCircle className="size-4" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {isActive ? "Pause" : "Activate"}
            </Button>
          )}
        </div>
      </header>

      {/* ── Stat Cards ── */}
      <EndpointStatsCards projectId={projectId} endpointId={endpointId} />
      <DeliveryMetricsCards projectId={projectId} endpointId={endpointId} />
      <DeliveryInsightsCharts projectId={projectId} endpointId={endpointId} />

      {/* ── Charts + Live Feed ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Volume bar chart — 2/3 width */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Event Volume
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground/70">
              Hourly distribution · last 24 hours
            </p>
          </div>
          <EventVolumeChart projectId={projectId} endpointId={endpointId} />
        </div>

        {/* Status donut — 1/3 width */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Status Distribution
            </p>
          </div>
          <EventStatusChart endpointId={endpointId} />
        </div>
      </div>

      {/* ── Live Feed ── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Recent Events
        </p>
        <Separator className="mb-4" />
        <LiveEventFeed endpointId={endpointId} projectId={projectId} />
      </div>
    </section>
  )
}
