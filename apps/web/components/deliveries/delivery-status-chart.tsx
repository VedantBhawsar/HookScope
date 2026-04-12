"use client"

import * as React from "react"
import { Cell, Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const STATUS_CONFIG: ChartConfig = {
  SUCCESS: { label: "Success", color: "var(--chart-1)" },
  FAILED: { label: "Failed", color: "var(--chart-2)" },
  PENDING: { label: "Pending", color: "var(--chart-3)" },
  RETRYING: { label: "Retrying", color: "var(--chart-4)" },
}

interface DeliveryStatusChartProps {
  statusBreakdown: Record<string, number>
}

export function DeliveryStatusChart({ statusBreakdown }: DeliveryStatusChartProps) {
  const chartData = Object.entries(statusBreakdown)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      label: STATUS_CONFIG[status]?.label ?? status,
      count,
      fill: STATUS_CONFIG[status]?.color ?? "var(--muted)",
    }))

  const total = chartData.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">No deliveries yet</p>
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
                  STATUS_CONFIG[name as string]?.label ?? String(name),
                ]}
              />
            }
          />
          <Pie data={chartData} dataKey="count" nameKey="status" innerRadius={55} outerRadius={88}>
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
        {chartData.map((d) => (
          <li key={d.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
            {d.label}
            <span className="font-medium text-foreground">{d.count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
