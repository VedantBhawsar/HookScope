"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { DeliveryStatusBadge } from "./delivery-status-badge"
import {
  useWebhookDeliveriesQuery,
  type DeliveryRecord,
} from "@/hooks/use-webhook-events"

function formatMs(ms: number | null): string {
  if (ms === null) return "—"
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function DeliveryRow({ delivery }: { delivery: DeliveryRecord }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DeliveryStatusBadge status={delivery.status} />
          {delivery.isReplay && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Replay
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(delivery.createdAt)}</span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          Response:{" "}
          <span className="font-medium text-foreground">
            {delivery.responseCode ?? "—"}
          </span>
        </span>
        <span>
          Latency:{" "}
          <span className="font-medium text-foreground">{formatMs(delivery.latencyMs)}</span>
        </span>
        <span>
          Retry #{delivery.retryCount}
        </span>
        {delivery.errorCode && (
          <span>
            Error:{" "}
            <span className="font-medium text-destructive">{delivery.errorCode}</span>
          </span>
        )}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{delivery.destinationUrl}</p>
    </div>
  )
}

export function DeliveriesList({ eventId }: { eventId: string }) {
  const [page, setPage] = React.useState(1)
  const query = useWebhookDeliveriesQuery(eventId, { page, limit: 10 })
  const result = query.data

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const deliveries = result?.data ?? []
  const pagination = result?.pagination

  if (deliveries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">No delivery attempts yet.</p>
    )
  }

  return (
    <div className="space-y-2">
      {deliveries.map((d) => (
        <DeliveryRow key={d.id} delivery={d} />
      ))}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
