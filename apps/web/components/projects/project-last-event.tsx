"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import type { EventStatus } from "@hookscope/db"
import { cn } from "@hookscope/ui/lib/utils"
import { useWebhookEventsQuery } from "@/hooks/use-webhook-events"

const STATUS_DOT: Record<EventStatus, string> = {
  RECEIVED: "bg-sky-500",
  PROCESSING: "bg-amber-500",
  DELIVERED: "bg-green-500",
  FAILED: "bg-red-500",
  DEAD_LETTER: "bg-red-500",
}

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function ProjectLastEvent({ projectId }: { projectId: string }) {
  const query = useWebhookEventsQuery({ projectId, page: 1, limit: 1 })

  if (query.isLoading) {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
        <LoaderCircle className="size-3 animate-spin" />
      </span>
    )
  }

  const event = query.data?.data?.[0]
  if (!event) {
    return (
      <span className="mt-1 inline-block text-[11px] text-muted-foreground/60">
        No events yet
      </span>
    )
  }

  return (
    <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          STATUS_DOT[event.status] ?? "bg-muted-foreground/50"
        )}
      />
      {event.eventType ? `${event.eventType} · ` : ""}
      {formatRelative(event.createdAt)}
    </span>
  )
}
