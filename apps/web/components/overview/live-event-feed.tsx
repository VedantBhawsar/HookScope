"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, LoaderCircle, Webhook } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { EventStatusBadge } from "@/components/events/event-status-badge"
import {
  useWebhookEventsQuery,
  webhookQueryKeys,
  type WebhookEventRecord,
} from "@/hooks/use-webhook-events"

const POLL_MS = 10_000

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5) return "just now"
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function EventRow({ event, projectId }: { event: WebhookEventRecord; projectId: string }) {
  return (
    <Link
      href={`/dashboard/${projectId}/${event.endpointId}/events`}
      className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <EventStatusBadge status={event.status} />
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-foreground">
            {event.eventId.length > 28 ? `${event.eventId.slice(0, 28)}…` : event.eventId}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {event.source}
            {event.eventType ? ` · ${event.eventType}` : ""}
          </p>
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
        {formatRelative(event.createdAt)}
      </span>
    </Link>
  )
}

interface LiveEventFeedProps {
  endpointId: string
  projectId: string
}

export function LiveEventFeed({ endpointId, projectId }: LiveEventFeedProps) {
  const queryClient = useQueryClient()
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  const query = useWebhookEventsQuery({
    endpointId,
    page: 1,
    limit: 8,
  })

  // Auto-refresh every 10s
  React.useEffect(() => {
    const id = setInterval(async () => {
      await queryClient.invalidateQueries({
        queryKey: webhookQueryKeys.lists(),
        exact: false,
      })
      setLastUpdated(new Date())
    }, POLL_MS)
    return () => clearInterval(id)
  }, [queryClient])

  const events = query.data?.data ?? []
  const total = query.data?.pagination.total ?? 0

  return (
    <div className="flex h-full flex-col">
      {/* Feed header with live indicator */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Live · refreshes every 10s
          </span>
          {query.isFetching && (
            <LoaderCircle className="size-3 animate-spin text-muted-foreground/60" />
          )}
        </div>
        <Link
          href={`/dashboard/${projectId}/${endpointId}/events`}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {total > 0 && (
            <span className="mr-1 text-foreground font-medium">{total.toLocaleString()}</span>
          )}
          View all
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Event rows */}
      {query.isLoading ? (
        <div className="flex flex-1 flex-col gap-2 px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="h-2.5 w-10 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <Webhook className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Waiting for events…</p>
          <p className="max-w-[220px] text-xs text-muted-foreground/70">
            Send a webhook to your endpoint URL to see events appear here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {events.map((event) => (
            <EventRow key={event.id} event={event} projectId={projectId} />
          ))}
        </div>
      )}

      {lastUpdated && (
        <p className="mt-2 px-1 text-[10px] text-muted-foreground/50">
          Last refreshed {formatRelative(lastUpdated.toISOString())}
        </p>
      )}
    </div>
  )
}
