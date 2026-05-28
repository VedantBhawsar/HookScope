import { Badge } from "@hookscope/ui/components/badge"
import type { EventStatus } from "@hookscope/db"

const CONFIG: Record<
  EventStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  RECEIVED: { label: "Received", variant: "secondary" },
  PROCESSING: { label: "Processing", variant: "outline" },
  DELIVERED: { label: "Delivered", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  DEAD_LETTER: { label: "Dead Letter", variant: "destructive" },
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, variant } = CONFIG[status] ?? { label: status, variant: "outline" }
  return <Badge variant={variant}>{label}</Badge>
}
