"use client"

import { LoaderCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { EventStatusBadge } from "./event-status-badge"
import { DeliveriesList } from "./deliveries-list"
import { EventLogsList } from "./event-logs-list"
import {
  useWebhookEventQuery,
  useRetryWebhookMutation,
} from "@/hooks/use-webhook-events"
import { getRequestErrorMessage } from "@/lib/http"

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value ?? "—"}</span>
    </div>
  )
}

interface EventDetailSheetProps {
  eventId: string | null
  onClose: () => void
}

export function EventDetailSheet({ eventId, onClose }: EventDetailSheetProps) {
  const eventQuery = useWebhookEventQuery(eventId)
  const retryMutation = useRetryWebhookMutation()

  const event = eventQuery.data

  async function handleRetry() {
    if (!eventId) return
    try {
      const { message } = await retryMutation.mutateAsync(eventId)
      toast.success(message ?? "Retry queued")
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  return (
    <Sheet open={Boolean(eventId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate font-mono text-sm">
                {event?.eventId ?? eventId}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {event ? `${event.source} · ${event.eventType ?? "unknown type"}` : "Loading…"}
              </SheetDescription>
            </div>
            {event && (
              <div className="flex shrink-0 items-center gap-2">
                <EventStatusBadge status={event.status} />
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
              </div>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {eventQuery.isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {event && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-2 px-6 py-4">
              <MetaRow label="Endpoint" value={event.endpoint.name} />
              <MetaRow label="Project" value={event.endpoint.project.name} />
              <MetaRow label="Source IP" value={event.sourceIp} />
              <MetaRow
                label="Last status code"
                value={event.lastStatusCode}
              />
              <MetaRow
                label="Deliveries"
                value={`${event._count.deliveries} attempts`}
              />
              <MetaRow label="Logs" value={`${event._count.logs} entries`} />
              <MetaRow
                label="Received"
                value={new Date(event.createdAt).toLocaleString()}
              />
            </div>

            <Separator />

            <Tabs defaultValue="deliveries" className="flex flex-1 flex-col overflow-hidden">
              <TabsList className="mx-6 mt-3 w-fit">
                <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>

              <TabsContent
                value="deliveries"
                className="flex-1 overflow-y-auto px-6 pb-6 pt-3"
              >
                <DeliveriesList eventId={event.id} />
              </TabsContent>

              <TabsContent
                value="logs"
                className="flex-1 overflow-y-auto px-6 pb-6 pt-3"
              >
                <EventLogsList eventId={event.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
