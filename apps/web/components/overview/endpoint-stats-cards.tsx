"use client"

import * as React from "react"
import {
  Activity,
  CheckCircle2,
  PauseCircle,
  Skull,
  TrendingDown,
  TrendingUp,
  Webhook,
} from "lucide-react"
import { useEndpointDetailQuery, useEndpointStatsQuery } from "@/hooks/use-endpoints"

interface StatCardProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ElementType
  highlight?: "success" | "danger" | "warning" | "neutral"
}

function StatCard({ label, value, sub, icon: Icon, highlight = "neutral" }: StatCardProps) {
  const iconColor = {
    success: "text-green-500",
    danger: "text-destructive",
    warning: "text-yellow-500",
    neutral: "text-muted-foreground/60",
  }[highlight]

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </article>
  )
}

function SkeletonCard() {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="mt-4 h-8 w-16 rounded bg-muted" />
      <div className="mt-2 h-2.5 w-20 rounded bg-muted/60" />
    </article>
  )
}

interface EndpointStatsCardsProps {
  projectId: string
  endpointId: string
}

export function EndpointStatsCards({ projectId, endpointId }: EndpointStatsCardsProps) {
  const endpointQuery = useEndpointDetailQuery(projectId, endpointId)
  const statsQuery = useEndpointStatsQuery(projectId, endpointId)
  const endpoint = endpointQuery.data
  const stats = statsQuery.data

  const isLoading = endpointQuery.isLoading || statsQuery.isLoading

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (!endpoint || !stats) return null

  const delivered = stats.statusBreakdown["DELIVERED"] ?? 0
  const failed = stats.statusBreakdown["FAILED"] ?? 0
  const deadLetters = stats.statusBreakdown["DEAD_LETTER"] ?? 0
  const processing = stats.statusBreakdown["PROCESSING"] ?? 0
  const isActive = endpoint.status === "active"

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        label="Total Events"
        value={stats.totalEvents.toLocaleString()}
        sub={`${endpoint.source} endpoint`}
        icon={Webhook}
      />
      <StatCard
        label="Delivered"
        value={delivered.toLocaleString()}
        sub={stats.totalEvents > 0 ? `${stats.successRate}% success rate` : "No events yet"}
        icon={TrendingUp}
        highlight="success"
      />
      <StatCard
        label="Failed"
        value={failed.toLocaleString()}
        sub={stats.totalEvents > 0 ? `${stats.failureRate}% failure rate` : "No failures"}
        icon={TrendingDown}
        highlight={failed > 0 ? "danger" : "neutral"}
      />
      <StatCard
        label="Dead Letters"
        value={deadLetters.toLocaleString()}
        sub={deadLetters > 0 ? "Require manual retry" : "None"}
        icon={Skull}
        highlight={deadLetters > 0 ? "danger" : "neutral"}
      />
      <StatCard
        label="Processing"
        value={processing.toLocaleString()}
        sub="In-flight now"
        icon={Activity}
        highlight={processing > 0 ? "warning" : "neutral"}
      />
      <StatCard
        label="Status"
        value={isActive ? "Active" : "Paused"}
        sub={`${endpoint.verificationMode} verification`}
        icon={isActive ? CheckCircle2 : PauseCircle}
        highlight={isActive ? "success" : "warning"}
      />
    </div>
  )
}
