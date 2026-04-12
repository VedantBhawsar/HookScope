"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const chartConfig: ChartConfig = {
  count: { label: "Events", color: "var(--chart-1)" },
}

const MAX_LABEL = 22

function truncate(s: string) {
  return s.length > MAX_LABEL ? `…${s.slice(-(MAX_LABEL - 1))}`  : s
}

interface EventTypeChartProps {
  eventTypeBreakdown: { eventType: string; count: number }[]
}

export function EventTypeChart({ eventTypeBreakdown }: EventTypeChartProps) {
  if (eventTypeBreakdown.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">No typed events yet</p>
        <p className="text-xs text-muted-foreground/70">
          Event types will appear once events are received.
        </p>
      </div>
    )
  }

  const chartData = eventTypeBreakdown.map((d) => ({
    ...d,
    label: truncate(d.eventType),
  }))

  const height = Math.max(160, chartData.length * 36)

  return (
    <ChartContainer config={chartConfig} style={{ height }} className="w-full">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 4, right: 24, top: 2, bottom: 2 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={148}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0]
            if (!item) return null
            const original = (item.payload as { eventType: string }).eventType
            return (
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                <p className="mb-1 font-medium text-foreground">{original}</p>
                <p className="text-muted-foreground">
                  {String(item.value).toLocaleString()} event{item.value === 1 ? "" : "s"}
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  )
}
