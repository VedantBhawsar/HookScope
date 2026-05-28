"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@hookscope/ui/components/chart"
import { useEndpointVolumeQuery } from "@/hooks/use-endpoints"
import { Button } from "@hookscope/ui/components/button"
import { cn } from "@hookscope/ui/lib/utils"

const chartConfig: ChartConfig = {
  delivered: { label: "Delivered", color: "var(--chart-1)" },
  failed: { label: "Failed", color: "var(--chart-2)" },
  other: { label: "Other", color: "var(--chart-3)" },
}

const TIME_RANGES = [
  { label: "24h", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "7d", hours: 168 },
  { label: "30d", hours: 720 },
] as const

type Hours = (typeof TIME_RANGES)[number]["hours"]

function formatBucketLabel(iso: string, granularity: "hour" | "day"): string {
  const d = new Date(iso)
  if (granularity === "day") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }
  return d.toLocaleTimeString(undefined, { hour: "numeric", hour12: true })
}

function xAxisInterval(hours: Hours): number {
  if (hours === 24) return 3   // every 4th hour
  if (hours === 72) return 11  // every 12th hour
  if (hours === 168) return 0  // every day (7 points)
  return 4                      // every 5th day (30 points)
}

function barSize(hours: Hours): number {
  if (hours === 24) return 8
  if (hours === 72) return 4
  if (hours === 168) return 14
  return 8
}

interface EventVolumeChartProps {
  projectId: string
  endpointId: string
}

export function EventVolumeChart({ projectId, endpointId }: EventVolumeChartProps) {
  const [hours, setHours] = React.useState<Hours>(24)
  const query = useEndpointVolumeQuery(projectId, endpointId, hours)
  const granularity = query.data?.granularity ?? "hour"

  const chartData = React.useMemo(() => {
    return (query.data?.data ?? []).map((point) => ({
      ...point,
      label: formatBucketLabel(point.hour, granularity),
    }))
  }, [query.data, granularity])

  const hasData = chartData.some((b) => b.delivered + b.failed + b.other > 0)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {granularity === "hour" ? "Hourly distribution" : "Daily distribution"}
          {" "}
          · last {hours === 24 ? "24 hours" : hours === 72 ? "3 days" : hours === 168 ? "7 days" : "30 days"}
        </p>
        <div className="flex gap-1">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.hours}
            type="button"
            onClick={() => setHours(range.hours)}
            className={cn(
              "h-7 px-2 text-xs",
              hours === range.hours
                ? "bg-foreground text-background hover:bg-foreground"
                : "text-muted-foreground"
            )}
            variant={hours === range.hours ? "default" : "ghost"}
            size="xs"
          >
            {range.label}
          </Button>
        ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex h-55 items-end gap-2 px-4 pb-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-sm bg-muted"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      ) : !hasData ? (
        <div className="flex h-55 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">No activity in this period</p>
          <p className="text-xs text-muted-foreground/70">Try selecting a longer time range.</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-55 w-full">
          <BarChart data={chartData} barSize={barSize(hours)} barGap={1}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--foreground)" }}
              interval={xAxisInterval(hours)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--foreground)" }}
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
      )}
    </div>
  )
}
