"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointDetailQuery, useEndpointDeliveryStatsQuery } from "@/hooks/use-endpoints"
import { DeliveryStatusChart } from "@/components/deliveries/delivery-status-chart"
import { ErrorCodeChart } from "@/components/deliveries/error-code-chart"
import { EventTypeChart } from "@/components/deliveries/event-type-chart"

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </article>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-4 h-8 w-16 rounded bg-muted" />
    </article>
  )
}

function formatMs(ms: number | null): string {
  if (ms == null) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default function EndpointDeliveriesPage() {
  const routeParams = useParams<{ projectId?: string; endpointId?: string }>()
  const projectId = typeof routeParams.projectId === "string" ? routeParams.projectId : null
  const endpointId = typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const { selectedProject } = useDashboardProjectContext()
  const endpointQuery = useEndpointDetailQuery(projectId, endpointId)
  const statsQuery = useEndpointDeliveryStatsQuery(projectId, endpointId)

  const endpoint = endpointQuery.data
  const stats = statsQuery.data
  const isLoading = endpointQuery.isLoading || statsQuery.isLoading

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deliveries</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {endpoint?.name ?? selectedProject?.name ?? "Deliveries"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Delivery performance, latency, error breakdown, and event type distribution.
        </p>
      </header>

      {/* ── Latency + Total stat cards ── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Deliveries"
            value={(stats?.totalDeliveries ?? 0).toLocaleString()}
          />
          <StatCard
            label="Avg Latency"
            value={formatMs(stats?.latency.avg ?? null)}
            sub="mean response time"
          />
          <StatCard
            label="Min Latency"
            value={formatMs(stats?.latency.min ?? null)}
            sub="fastest delivery"
          />
          <StatCard
            label="Max Latency"
            value={formatMs(stats?.latency.max ?? null)}
            sub="slowest delivery"
          />
        </div>
      )}

      {/* ── Charts row 1 ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Delivery Status Breakdown">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-40 w-40 animate-pulse rounded-full bg-muted" />
            </div>
          ) : (
            <DeliveryStatusChart statusBreakdown={stats?.statusBreakdown ?? {}} />
          )}
        </ChartCard>

        <ChartCard title="Error Code Breakdown">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 rounded bg-muted" style={{ width: `${70 - i * 12}%` }} />
              ))}
            </div>
          ) : (
            <ErrorCodeChart errorCodeBreakdown={stats?.errorCodeBreakdown ?? {}} />
          )}
        </ChartCard>
      </div>

      {/* ── Charts row 2 ── */}
      <ChartCard title="Top Event Types">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-muted" style={{ width: `${80 - i * 10}%` }} />
            ))}
          </div>
        ) : (
          <EventTypeChart eventTypeBreakdown={stats?.eventTypeBreakdown ?? []} />
        )}
      </ChartCard>
    </section>
  )
}
