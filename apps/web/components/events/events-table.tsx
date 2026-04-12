"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, LoaderCircle, Webhook } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { EventStatusBadge } from "./event-status-badge"
import { EventDetailSheet } from "./event-detail-sheet"
import { useWebhookEventsQuery, type WebhookEventsQueryInput } from "@/hooks/use-webhook-events"
import type { EventStatus } from "@workspace/db"

const EVENT_STATUSES: EventStatus[] = [
  "RECEIVED",
  "PROCESSING",
  "DELIVERED",
  "FAILED",
  "DEAD_LETTER",
]

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface EventsTableProps {
  endpointId: string
}

export function EventsTable({ endpointId }: EventsTableProps) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<EventStatus | "">("")
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null)

  const debouncedSearch = useDebounced(search, 300)

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  const queryInput: WebhookEventsQueryInput = {
    endpointId,
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
  }

  const query = useWebhookEventsQuery(queryInput)
  const events = query.data?.data ?? []
  const pagination = query.data?.pagination

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by event ID or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 text-sm"
        />
        <Select
          value={status}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : (v as EventStatus))}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {EVENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {query.isFetching && !query.isLoading && (
          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead>Event ID</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Received</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Webhook className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No events found</p>
                    {(search || status) && (
                      <p className="text-xs text-muted-foreground/70">
                        Try clearing your filters
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <TableCell>
                    <EventStatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.eventId.length > 24
                      ? `${event.eventId.slice(0, 24)}…`
                      : event.eventId}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {event.source}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {event.eventType ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right text-xs text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {pagination.total.toLocaleString()} events · page {pagination.page} of{" "}
            {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <EventDetailSheet
        eventId={selectedEventId}
        onClose={() => setSelectedEventId(null)}
      />
    </>
  )
}
