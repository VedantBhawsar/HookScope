"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react"
import { cn } from "@hookscope/ui/lib/utils"
import { Button } from "@hookscope/ui/components/button"
import { useWebhookLogsQuery, type EventLogRecord } from "@/hooks/use-webhook-events"

const LOG_STATUS_DOT: Record<string, string> = {
  INFO: "bg-muted-foreground",
  WARNING: "bg-yellow-500",
  ERROR: "bg-destructive",
  SUCCESS: "bg-green-500",
}

const LOG_TYPE_LABELS: Record<string, string> = {
  EVENT_RECEIVED: "Event Received",
  SIGNATURE_VERIFIED: "Signature Verified",
  DELIVERY_ATTEMPT: "Delivery Attempt",
  DELIVERY_SUCCESS: "Delivery Success",
  DELIVERY_FAILED: "Delivery Failed",
  RETRY_SCHEDULED: "Retry Scheduled",
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

function LogRow({ log }: { log: EventLogRecord }) {
  const dot = LOG_STATUS_DOT[log.status] ?? "bg-muted-foreground"
  const label = LOG_TYPE_LABELS[log.type] ?? log.type

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">{label}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatDate(log.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{log.message}</p>
      </div>
    </div>
  )
}

export function EventLogsList({ eventId }: { eventId: string }) {
  const [page, setPage] = React.useState(1)
  const query = useWebhookLogsQuery(eventId, { page, limit: 20 })
  const result = query.data

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const logs = result?.data ?? []
  const pagination = result?.pagination

  if (logs.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No logs yet.</p>
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {logs.map((log) => (
          <LogRow key={log.id} log={log} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
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
