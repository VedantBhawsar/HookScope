"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { useEndpointVolumeQuery } from "@/hooks/use-endpoints"

const chartConfig: ChartConfig = {
  delivered: { label: "Delivered", color: "hsl(var(--chart-1))" },
  failed: { label: "Failed", color: "hsl(var(--chart-2))" },
  other: { label: "Other", color: "hsl(var(--chart-3))" },
}

interface EventVolumeChartProps {
  projectId: string
  endpointId: string
}

export function EventVolumeChart({ projectId, endpointId }: EventVolumeChartProps) {
  const query = useEndpointVolumeQuery(projectId, endpointId, 24)

  const chartData = React.useMemo(() => {
    return (query.data?.data ?? []).map((point) => ({
      ...point,
      label: new Date(point.hour).toLocaleTimeString(undefined, {
        hour: "numeric",
        hour12: true,
      }),
    }))
  }, [query.data])

  const hasData = chartData.some((b) => b.delivered + b.failed + b.other > 0)

  if (query.isLoading) {
    return (
      <div className="flex h-[220px] items-end gap-2 px-4 pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-sm bg-muted"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground/70">
          No events in the last 24 hours.
        </p>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={chartData} barSize={8} barGap={1}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval={3}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          allowDecimals={false}
          width={24}
        />
        <ChartTooltip
          content={<ChartTooltipContent hideLabel indicator="dot" />}
          cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
        />
        <Bar dataKey="delivered" fill="var(--color-delivered)" radius={[3, 3, 0, 0]} stackId="a" />
        <Bar dataKey="failed" fill="var(--color-failed)" radius={[0, 0, 0, 0]} stackId="a" />
        <Bar dataKey="other" fill="var(--color-other)" radius={[0, 0, 0, 0]} stackId="a" />
      </BarChart>
    </ChartContainer>
  )
}
