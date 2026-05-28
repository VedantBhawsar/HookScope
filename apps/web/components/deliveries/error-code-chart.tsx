"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@hookscope/ui/components/chart"

const ERROR_LABELS: Record<string, string> = {
  SIGNATURE_INVALID: "Invalid Signature",
  RATE_LIMITED: "Rate Limited",
  DESTINATION_UNREACHABLE: "Unreachable",
  TIMEOUT: "Timeout",
  PAYLOAD_TOO_LARGE: "Payload Too Large",
  PROCESSING_ERROR: "Processing Error",
}

const chartConfig: ChartConfig = {
  count: { label: "Occurrences", color: "var(--chart-2)" },
}

interface ErrorCodeChartProps {
  errorCodeBreakdown: Record<string, number>
}

export function ErrorCodeChart({ errorCodeBreakdown }: ErrorCodeChartProps) {
  const chartData = Object.entries(errorCodeBreakdown)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({
      code,
      label: ERROR_LABELS[code] ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">No errors recorded</p>
        <p className="text-xs text-muted-foreground/70">All deliveries completed without errors.</p>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
        <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  )
}
