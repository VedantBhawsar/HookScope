"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, LoaderCircle, Webhook, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import { Input } from "@hookscope/ui/components/input"
import { Checkbox } from "@hookscope/ui/components/checkbox"
import { ConfirmDeleteDialog } from "@hookscope/ui/components/confirm-delete-dialog"
import { toast } from "@hookscope/ui/components/sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hookscope/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hookscope/ui/components/table"
import { EventStatusBadge } from "./event-status-badge"
import { EventDetailSheet } from "./event-detail-sheet"
import {
  useWebhookEventsQuery,
  useBatchReplayMutation,
  useBatchDeleteMutation,
  type WebhookEventsQueryInput,
} from "@/hooks/use-webhook-events"
import type { EventStatus } from "@hookscope/db"

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
  const [eventType, setEventType] = React.useState("")
  const [status, setStatus] = React.useState<EventStatus | "">("")
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(
    null
  )
  const [selectedEventIds, setSelectedEventIds] = React.useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  const debouncedSearch = useDebounced(search, 300)
  const debouncedEventType = useDebounced(eventType, 300)

  const batchReplayMutation = useBatchReplayMutation()
  const batchDeleteMutation = useBatchDeleteMutation()

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setPage(1)
  }, [debouncedEventType, debouncedSearch, status])

  const queryInput: WebhookEventsQueryInput = {
    endpointId,
    page,
    limit: 20,
    eventType: debouncedEventType || undefined,
    search: debouncedSearch || undefined,
    status: status || undefined,
  }

  const query = useWebhookEventsQuery(queryInput)
  const events = query.data?.data ?? []
  const pagination = query.data?.pagination
  const hasActiveFilters = Boolean(search || eventType || status)

  const clearFilters = React.useCallback(() => {
    setSearch("")
    setEventType("")
    setStatus("")
    setPage(1)
  }, [])

  const toggleSelectEvent = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedEventIds.size === events.length && events.length > 0) {
      setSelectedEventIds(new Set())
    } else {
      setSelectedEventIds(new Set(events.map((e) => e.id)))
    }
  }

  const handleBatchReplay = async () => {
    const ids = Array.from(selectedEventIds)
    try {
      const result = await batchReplayMutation.mutateAsync(ids)
      toast.success(result.message)
      setSelectedEventIds(new Set())
    } catch (error) {
      toast.error("Failed to replay events")
    }
  }

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedEventIds)
    try {
      const result = await batchDeleteMutation.mutateAsync(ids)
      toast.success(result.message)
      setSelectedEventIds(new Set())
      setShowDeleteConfirm(false)
    } catch (error) {
      toast.error("Failed to delete events")
    }
  }

  return (
    <>
      {/* Bulk action toolbar */}
      {selectedEventIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
          <span className="text-sm text-muted-foreground">
            {selectedEventIds.size} event{selectedEventIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchReplay}
              disabled={batchReplayMutation.isPending}
              className="gap-1.5"
            >
              {batchReplayMutation.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Replay
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={batchDeleteMutation.isPending}
              className="gap-1.5"
            >
              {batchDeleteMutation.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search by event ID or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Filter by event type…"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="h-8 w-56 text-sm"
          />
          <Select
            value={status}
            onValueChange={(v) =>
              setStatus(v === "ALL" ? "" : (v as EventStatus))
            }
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </Button>
          {query.isFetching && !query.isLoading && (
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedEventIds.size === events.length && events.length > 0}
                  onCheckedChange={toggleSelectAll}
                  disabled={events.length === 0}
                  aria-label="Select all events"
                />
              </TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead>Event ID</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Received
              </TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Webhook className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No events found
                    </p>
                    {hasActiveFilters && (
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
                  className={selectedEventIds.has(event.id) ? "bg-muted/50" : ""}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedEventIds.has(event.id)}
                      onCheckedChange={() => toggleSelectEvent(event.id)}
                      aria-label={`Select event ${event.eventId}`}
                    />
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => setSelectedEventId(event.id)}>
                    <EventStatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="cursor-pointer font-mono text-xs" onClick={() => setSelectedEventId(event.id)}>
                    {event.eventId.length > 24
                      ? `${event.eventId.slice(0, 24)}…`
                      : event.eventId}
                  </TableCell>
                  <TableCell className="hidden cursor-pointer text-sm sm:table-cell" onClick={() => setSelectedEventId(event.id)}>
                    {event.source}
                  </TableCell>
                  <TableCell className="hidden cursor-pointer text-sm text-muted-foreground md:table-cell" onClick={() => setSelectedEventId(event.id)}>
                    {event.eventType ?? "—"}
                  </TableCell>
                  <TableCell className="hidden cursor-pointer text-right text-xs text-muted-foreground lg:table-cell" onClick={() => setSelectedEventId(event.id)}>
                    {formatDate(event.createdAt)}
                  </TableCell>
                  <TableCell onClick={() => setSelectedEventId(event.id)}>
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
            {pagination.total.toLocaleString()} events · page {pagination.page}{" "}
            of {pagination.totalPages}
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

      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        entityName="webhook events"
        entityLabel={`${selectedEventIds.size} event${selectedEventIds.size !== 1 ? "s" : ""}`}
        onConfirm={handleBatchDelete}
        isPending={batchDeleteMutation.isPending}
      />

      <EventDetailSheet
        eventId={selectedEventId}
        onClose={() => setSelectedEventId(null)}
      />
    </>
  )
}
