"use client"

import * as React from "react"
import { LoaderCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@hookscope/ui/components/button"
import { Separator } from "@hookscope/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hookscope/ui/components/sheet"
import { DeliveryStatusBadge } from "@/components/events/delivery-status-badge"
import { useRetryWebhookMutation } from "@/hooks/use-webhook-events"
import { getRequestErrorMessage } from "@/lib/http"
import type { EndpointDeliveryRecord } from "@/hooks/use-endpoints"

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_CODE_LABELS: Record<string, string> = {
  SIGNATURE_INVALID: "Signature Invalid",
  RATE_LIMITED: "Rate Limited",
  DESTINATION_UNREACHABLE: "Destination Unreachable",
  TIMEOUT: "Timeout",
  PAYLOAD_TOO_LARGE: "Payload Too Large",
  PROCESSING_ERROR: "Processing Error",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms: number | null): string {
  if (ms === null) return "—"
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatRetryAt(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "Imminent"
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `in ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `in ${mins}m ${secs % 60}s`
  return `in ${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ─── MetaRow — mirrors event-detail-sheet.tsx exactly ─────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value ?? "—"}</span>
    </div>
  )
}

/** Use for long values (URLs, IDs) that should wrap below their label instead of truncating. */
function MetaBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all font-medium">{value ?? "—"}</span>
    </div>
  )
}

function HttpCode({ code }: { code: number | null }) {
  if (code === null) return <span className="text-muted-foreground">—</span>
  const color =
    code >= 500
      ? "text-destructive"
      : code >= 400
        ? "text-orange-500 dark:text-orange-400"
        : code >= 200 && code < 300
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground"
  return <span className={`font-mono font-semibold ${color}`}>{code}</span>
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DeliveryDetailSheetProps {
  delivery: EndpointDeliveryRecord | null
  onClose: () => void
  onRetrySuccess?: () => void
}

export function DeliveryDetailSheet({
  delivery,
  onClose,
  onRetrySuccess,
}: DeliveryDetailSheetProps) {
  const retryMutation = useRetryWebhookMutation()

  async function handleRetry() {
    if (!delivery) return
    try {
      const { message } = await retryMutation.mutateAsync(delivery.webhookEventId)
      toast.success(message ?? "Retry queued")
      onRetrySuccess?.()
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  return (
    <Sheet open={Boolean(delivery)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        {/* ── Header ── */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate font-mono text-sm">
                {delivery?.event.eventId ?? "—"}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {delivery
                  ? `${delivery.event.source} · ${delivery.event.eventType ?? "unknown type"}`
                  : "Loading…"}
              </SheetDescription>
            </div>

            {delivery && (
              <div className="flex shrink-0 items-center gap-2">
                <DeliveryStatusBadge status={delivery.status} />
                {delivery.isReplay && (
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Replay
                  </span>
                )}
                {delivery.status === "FAILED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={retryMutation.isPending}
                  >
                    {retryMutation.isPending ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* ── Body ── */}
        {delivery && (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Delivery meta */}
            <div className="space-y-2 px-6 py-4">
              <MetaRow label="HTTP status" value={<HttpCode code={delivery.responseCode} />} />
              <MetaRow label="Latency" value={formatMs(delivery.latencyMs)} />
              <MetaRow
                label="Retry #"
                value={delivery.retryCount > 0 ? `#${delivery.retryCount}` : "First attempt"}
              />
              <MetaBlock label="Destination URL" value={delivery.destinationUrl} />
              {delivery.errorCode && (
                <MetaRow
                  label="Error code"
                  value={
                    <span className="font-mono text-xs text-destructive">
                      {ERROR_CODE_LABELS[delivery.errorCode] ?? delivery.errorCode}
                    </span>
                  }
                />
              )}
              {delivery.status === "RETRYING" && delivery.nextRetryAt && (
                <MetaRow
                  label="Next retry"
                  value={
                    <span className="text-amber-500 dark:text-amber-400">
                      {formatRetryAt(delivery.nextRetryAt)}
                      {" · "}
                      {formatDateFull(delivery.nextRetryAt)}
                    </span>
                  }
                />
              )}
              <MetaRow label="Attempted" value={formatDateFull(delivery.createdAt)} />
            </div>

            {/* Response body — shown inline when present */}
            {delivery.responseBody && (
              <>
                <Separator />
                <div className="px-6 py-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Response Body
                  </p>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap break-all">
                    {delivery.responseBody}
                  </pre>
                </div>
              </>
            )}

            {/* Event context */}
            <Separator />
            <div className="space-y-2 px-6 py-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Event Context
              </p>
              <MetaBlock
                label="Event ID"
                value={<span className="font-mono text-xs">{delivery.event.eventId}</span>}
              />
              <MetaRow label="Event type" value={delivery.event.eventType ?? "—"} />
              <MetaRow label="Source" value={delivery.event.source} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
