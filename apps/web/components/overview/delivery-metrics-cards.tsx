"use client"

import * as React from "react"
import { useEndpointDeliveryStatsQuery } from "@/hooks/use-endpoints"

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </article>
  )
}

function SkeletonCard() {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
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

interface DeliveryMetricsCardsProps {
  projectId: string
  endpointId: string
}

export function DeliveryMetricsCards({ projectId, endpointId }: DeliveryMetricsCardsProps) {
  const statsQuery = useEndpointDeliveryStatsQuery(projectId, endpointId)
  const stats = statsQuery.data

  if (statsQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Delivery Metrics</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Deliveries" value={(stats?.totalDeliveries ?? 0).toLocaleString()} />
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
    </div>
  )
}