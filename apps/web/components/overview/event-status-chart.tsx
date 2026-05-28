"use client"

import * as React from "react"
import { Cell, Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@hookscope/ui/components/chart"
import { useWebhookEventsQuery } from "@/hooks/use-webhook-events"

const STATUS_CONFIG: ChartConfig = {
  DELIVERED: { label: "Delivered", color: "var(--chart-1)" },
  FAILED: { label: "Failed", color: "var(--chart-2)" },
  RECEIVED: { label: "Received", color: "var(--chart-3)" },
  PROCESSING: { label: "Processing", color: "var(--chart-4)" },
  DEAD_LETTER: { label: "Dead Letter", color: "var(--chart-5)" },
}

const STATUSES = ["DELIVERED", "FAILED", "RECEIVED", "PROCESSING", "DEAD_LETTER"] as const
type EventStatus = (typeof STATUSES)[number]

interface EventStatusChartProps {
  endpointId: string
}

export function EventStatusChart({ endpointId }: EventStatusChartProps) {
  // Fetch total counts per status using pagination.total from limit=1 queries
  const queries = {
    DELIVERED: useWebhookEventsQuery({ endpointId, page: 1, limit: 1, status: "DELIVERED" }),
    FAILED: useWebhookEventsQuery({ endpointId, page: 1, limit: 1, status: "FAILED" }),
    RECEIVED: useWebhookEventsQuery({ endpointId, page: 1, limit: 1, status: "RECEIVED" }),
    PROCESSING: useWebhookEventsQuery({ endpointId, page: 1, limit: 1, status: "PROCESSING" }),
    DEAD_LETTER: useWebhookEventsQuery({ endpointId, page: 1, limit: 1, status: "DEAD_LETTER" }),
  }

  const isLoading = Object.values(queries).some((q) => q.isLoading)

  // Keep only non-zero slices so legend and chart are always in sync
  const chartData = STATUSES.map((status) => ({
    status,
    label: STATUS_CONFIG[status]?.label ?? status,
    count: queries[status].data?.pagination.total ?? 0,
    fill: STATUS_CONFIG[status]?.color ?? "var(--muted)",
  })).filter((d) => d.count > 0)

  const total = chartData.reduce((sum, d) => sum + d.count, 0)

  if (isLoading) {
    return (
      <div className="flex h-70 items-center justify-center">
        <div className="h-48 w-48 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex h-70 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">No events yet</p>
        <p className="text-xs text-muted-foreground/70">
          The chart will appear once events start flowing.
        </p>
      </div>
    )
  }

  return (
    <div>
      <ChartContainer config={STATUS_CONFIG} className="h-55 w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="status"
                formatter={(value, name) => [
                  `${String(value).toLocaleString()} (${((Number(value) / total) * 100).toFixed(1)}%)`,
                  STATUS_CONFIG[name as EventStatus]?.label ?? String(name),
                ]}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="status"
            innerRadius="55%"
            outerRadius="80%"
            strokeWidth={2}
            stroke="hsl(var(--background))"
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Custom legend for non-zero statuses only */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {chartData.map((entry) => (
          <div key={entry.status} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 shrink-0 rounded-xs"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs text-muted-foreground">
              {entry.label}
              <span className="ml-1 font-semibold text-foreground">
                {entry.count.toLocaleString()}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
