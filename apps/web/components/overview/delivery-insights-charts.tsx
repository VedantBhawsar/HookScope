"use client"

import * as React from "react"
import { useEndpointDeliveryStatsQuery } from "@/hooks/use-endpoints"
import { DeliveryStatusChart } from "@/components/deliveries/delivery-status-chart"
import { ErrorCodeChart } from "@/components/deliveries/error-code-chart"
import { EventTypeChart } from "@/components/deliveries/event-type-chart"

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

interface DeliveryInsightsChartsProps {
  projectId: string
  endpointId: string
}

export function DeliveryInsightsCharts({ projectId, endpointId }: DeliveryInsightsChartsProps) {
  const statsQuery = useEndpointDeliveryStatsQuery(projectId, endpointId)
  const stats = statsQuery.data
  const isLoading = statsQuery.isLoading

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Delivery Insights</p>

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
    </div>
  )
}