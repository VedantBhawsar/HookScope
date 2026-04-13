"use client"

import * as React from "react"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import type { AlertTriggerWithAlert } from "@/hooks/use-alerts"

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 max-w-[70%] whitespace-normal break-all text-right font-medium leading-5">
        {value ?? "-"}
      </span>
    </div>
  )
}

function severityVariant(severity: "INFO" | "WARNING" | "CRITICAL") {
  if (severity === "CRITICAL") return "destructive"
  if (severity === "WARNING") return "secondary"
  return "outline"
}

function getEndpointIdFromMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return null
  const value = metadata["endpointId"]
  return typeof value === "string" ? value : null
}

interface AlertTriggerDetailSheetProps {
  trigger: AlertTriggerWithAlert | null
  onClose: () => void
}

export function AlertTriggerDetailSheet({ trigger, onClose }: AlertTriggerDetailSheetProps) {
  return (
    <Sheet open={Boolean(trigger)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate font-mono text-sm">
                {trigger?.id ?? "Trigger"}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {trigger ? `${trigger.alert.name} · ${trigger.alert.type}` : "Loading..."}
              </SheetDescription>
            </div>
            {trigger ? (
              <Badge variant={severityVariant(trigger.alert.severity)}>
                {trigger.alert.severity}
              </Badge>
            ) : null}
          </div>
        </SheetHeader>

        <Separator />

        {trigger ? (
          <div className="space-y-2 px-6 py-4">
            <MetaRow label="Alert" value={trigger.alert.name} />
            <MetaRow label="Type" value={trigger.alert.type} />
            <MetaRow label="Severity" value={trigger.alert.severity} />
            <MetaRow
              label="Triggered"
              value={new Date(trigger.createdAt).toLocaleString()}
            />
            <MetaRow
              label="Endpoint"
              value={getEndpointIdFromMetadata(trigger.metadata)}
            />
            <MetaRow label="Message" value={trigger.message} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
