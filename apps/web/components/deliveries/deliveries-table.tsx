"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, LoaderCircle, PackageX } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
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
import {
  useEndpointDeliveriesQuery,
  type EndpointDeliveryRecord,
} from "@/hooks/use-endpoints"
import type { DeliveryStatus } from "@workspace/db"

const DELIVERY_STATUSES: DeliveryStatus[] = ["PENDING", "SUCCESS", "FAILED", "RETRYING"]

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

interface DeliveriesTableProps {
  projectId: string
  endpointId: string
}

export function DeliveriesTable({ projectId, endpointId }: DeliveriesTableProps) {
  const [page, setPage] = React.useState(1)
  const [status, setStatus] = React.useState<DeliveryStatus | "">("")

  React.useEffect(() => {
    setPage(1)
  }, [status])

  const query = useEndpointDeliveriesQuery(projectId, endpointId, {
    page,
    limit: 20,
    status: status || undefined,
  })

  const deliveries = query.data?.data ?? []
  const pagination = query.data?.pagination

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Recent Deliveries
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => setStatus(v === "ALL" ? "" : (v as DeliveryStatus))}
          >
            <SelectTrigger className="h-8 w-40 text-sm">
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
              <TableHead className="w-30">Status</TableHead>
              <TableHead className="w-20">HTTP</TableHead>
              <TableHead className="hidden md:table-cell">Event Type</TableHead>
              <TableHead className="hidden lg:table-cell">Latency</TableHead>
              <TableHead className="hidden lg:table-cell">Retry #</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Attempted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <PackageX className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No deliveries found</p>
                    {status && (
                      <p className="text-xs text-muted-foreground/70">
                        Try clearing the status filter
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery: EndpointDeliveryRecord) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <DeliveryStatusBadge status={delivery.status} />
                  </TableCell>
                  <TableCell>
                    <HttpCodeBadge code={delivery.responseCode} />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {delivery.event.eventType ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatMs(delivery.latencyMs)}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {delivery.retryCount > 0 ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        #{delivery.retryCount}
                        {delivery.isReplay && " (replay)"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                    {formatDate(delivery.createdAt)}
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
    </>
  )
}
