"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  PackageX,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
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
import { DeliveryStatusBadge } from "@/components/events/delivery-status-badge"
import { DeliveryDetailSheet } from "@/components/deliveries/delivery-detail-sheet"
import {
  useEndpointDeliveriesQuery,
  type EndpointDeliveryRecord,
} from "@/hooks/use-endpoints"
import { useRetryWebhookMutation } from "@/hooks/use-webhook-events"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { DeliveryStatus } from "@workspace/db"

// ─── Constants ────────────────────────────────────────────────────────────────

const DELIVERY_STATUSES: DeliveryStatus[] = ["PENDING", "SUCCESS", "FAILED", "RETRYING"]

const ERROR_CODES = [
  "SIGNATURE_INVALID",
  "RATE_LIMITED",
  "DESTINATION_UNREACHABLE",
  "TIMEOUT",
  "PAYLOAD_TOO_LARGE",
  "PROCESSING_ERROR",
] as const

type DeliveryErrorCode = (typeof ERROR_CODES)[number]

const ERROR_CODE_LABELS: Record<DeliveryErrorCode, string> = {
  SIGNATURE_INVALID: "Signature Invalid",
  RATE_LIMITED: "Rate Limited",
  DESTINATION_UNREACHABLE: "Unreachable",
  TIMEOUT: "Timeout",
  PAYLOAD_TOO_LARGE: "Payload Too Large",
  PROCESSING_ERROR: "Processing Error",
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—"
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

function formatRetryAt(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "Imminent"
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `in ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `in ${mins}m`
  return `in ${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HttpCodeBadge({ code }: { code: number | null }) {
  if (code === null) return <span className="text-muted-foreground">—</span>
  const color =
    code >= 500
      ? "text-destructive"
      : code >= 400
        ? "text-orange-500 dark:text-orange-400"
        : code >= 200 && code < 300
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground"
  return <span className={`font-mono text-xs font-semibold ${color}`}>{code}</span>
}

function ErrorCodeBadge({ code }: { code: string | null }) {
  if (!code) return <span className="text-muted-foreground">—</span>
  const label = ERROR_CODE_LABELS[code as DeliveryErrorCode] ?? code
  return (
    <span className="inline-flex items-center rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-destructive">
      {label}
    </span>
  )
}

function RetryCountCell({
  retryCount,
  isReplay,
  status,
  nextRetryAt,
}: {
  retryCount: number
  isReplay: boolean
  status: string
  nextRetryAt: string | null
}) {
  if (status === "RETRYING" && nextRetryAt) {
    return (
      <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
        {formatRetryAt(nextRetryAt)}
      </span>
    )
  }
  if (retryCount === 0 && !isReplay) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
      #{retryCount}
      {isReplay && (
        <span className="text-muted-foreground"> replay</span>
      )}
    </span>
  )
}

// ─── Inline retry button ──────────────────────────────────────────────────────

function RetryButton({
  webhookEventId,
  projectId,
  endpointId,
}: {
  webhookEventId: string
  projectId: string
  endpointId: string
}) {
  const queryClient = useQueryClient()
  const retryMutation = useRetryWebhookMutation()

  function handleRetry(e: React.MouseEvent) {
    e.stopPropagation()
    retryMutation.mutate(webhookEventId, {
      onSuccess: (data) => {
        toast.success(data.message ?? "Retry queued")
        void queryClient.invalidateQueries({
          queryKey: ["endpoints", projectId, endpointId, "deliveries"],
          exact: false,
        })
      },
      onError: () => toast.error("Failed to queue retry"),
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      disabled={retryMutation.isPending}
      onClick={handleRetry}
      title="Retry this event"
    >
      <RefreshCw className={`size-3.5 ${retryMutation.isPending ? "animate-spin" : ""}`} />
    </Button>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────

interface DeliveriesTableProps {
  projectId: string
  endpointId: string
}

export function DeliveriesTable({ projectId, endpointId }: DeliveriesTableProps) {
  const [page, setPage] = React.useState(1)
  const [status, setStatus] = React.useState<DeliveryStatus | "">("")
  const [errorCode, setErrorCode] = React.useState<DeliveryErrorCode | "">("")
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [selectedDelivery, setSelectedDelivery] = React.useState<EndpointDeliveryRecord | null>(null)

  // Debounce search input by 350ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Reset page when any filter changes
  React.useEffect(() => { setPage(1) }, [status, errorCode, debouncedSearch])

  const query = useEndpointDeliveriesQuery(projectId, endpointId, {
    page,
    limit: 20,
    status: status || undefined,
    errorCode: errorCode || undefined,
    search: debouncedSearch || undefined,
  })

  const deliveries = query.data?.data ?? []
  const pagination = query.data?.pagination
  const hasActiveFilters = Boolean(status || errorCode || debouncedSearch)

  function clearFilters() {
    setStatus("")
    setErrorCode("")
    setSearch("")
  }

  return (
    <>
      {/* ── Filter bar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Recent Deliveries
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event ID or type…"
              className="h-8 w-52 pl-8 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select
            value={status}
            onValueChange={(v) => setStatus(v === "ALL" ? "" : (v as DeliveryStatus))}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {DELIVERY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Error code filter */}
          <Select
            value={errorCode}
            onValueChange={(v) => setErrorCode(v === "ALL" ? "" : (v as DeliveryErrorCode))}
          >
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All error codes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All error codes</SelectItem>
              {ERROR_CODES.map((c) => (
                <SelectItem key={c} value={c}>
                  {ERROR_CODE_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" className="size-8" onClick={clearFilters} title="Clear filters">
              <X className="size-3.5" />
            </Button>
          )}

          {query.isFetching && !query.isLoading && (
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-16">HTTP</TableHead>
              <TableHead className="hidden md:table-cell">Event Type</TableHead>
              <TableHead className="hidden xl:table-cell">Error Code</TableHead>
              <TableHead className="hidden lg:table-cell">Latency</TableHead>
              <TableHead className="hidden lg:table-cell">Retry / Next</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Attempted</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <PackageX className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No deliveries found</p>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery: EndpointDeliveryRecord) => (
                <TableRow
                  key={delivery.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedDelivery(delivery)}
                >
                  <TableCell>
                    <DeliveryStatusBadge status={delivery.status} />
                  </TableCell>
                  <TableCell>
                    <HttpCodeBadge code={delivery.responseCode} />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    <div className="flex items-center gap-1.5">
                      {delivery.event.eventType ?? "—"}
                      {delivery.isReplay && (
                        <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          replay
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <ErrorCodeBadge code={delivery.errorCode} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatMs(delivery.latencyMs)}
                  </TableCell>
                  <TableCell className="hidden text-xs lg:table-cell">
                    <RetryCountCell
                      retryCount={delivery.retryCount}
                      isReplay={delivery.isReplay}
                      status={delivery.status}
                      nextRetryAt={delivery.nextRetryAt}
                    />
                  </TableCell>
                  <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                    {formatDate(delivery.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {delivery.status === "FAILED" && (
                      <RetryButton
                        webhookEventId={delivery.webhookEventId}
                        projectId={projectId}
                        endpointId={endpointId}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {pagination.total.toLocaleString()} deliveries · page {pagination.page} of{" "}
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

      {/* ── Detail sheet ── */}
      <DeliveryDetailSheet
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
        onRetrySuccess={() => {
          void query.refetch()
          setSelectedDelivery(null)
        }}
      />
    </>
  )
}
