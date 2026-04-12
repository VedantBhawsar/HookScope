import { Badge } from "@workspace/ui/components/badge"
import type { DeliveryStatus } from "@workspace/db"

const CONFIG: Record<
  DeliveryStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  SUCCESS: { label: "Success", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  RETRYING: { label: "Retrying", variant: "secondary" },
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const { label, variant } = CONFIG[status] ?? { label: status, variant: "outline" }
  return <Badge variant={variant}>{label}</Badge>
}
