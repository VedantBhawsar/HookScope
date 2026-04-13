"use client"

import * as React from "react"
import { toast } from "sonner"
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { ConfirmDeleteDialog } from "@workspace/ui/components/confirm-delete-dialog"
import {
  useAlertsQuery,
  useDeleteAlertMutation,
  useUpdateAlertMutation,
  type AlertRecord,
} from "@/hooks/use-alerts"
import { AlertEditDialog } from "./alert-edit-dialog"
import { getRequestErrorMessage } from "@/lib/http"

function formatLastTriggered(iso: string | null) {
  if (!iso) return "Never"
  const date = new Date(iso)
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertRecord["severity"] }) {
  const variant = severity === "CRITICAL" ? "destructive" : severity === "WARNING" ? "secondary" : "outline"
  return <Badge variant={variant}>{severity}</Badge>
}

// ─── Alert type label ─────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  DELIVERY_FAILURE_RATE: "Failure Rate",
  DELIVERY_ERROR_CODE: "Error Code",
  EVENT_FAILED: "Event Failed",
  ENDPOINT_SILENCE: "Silence",
}

// ─── Row actions ──────────────────────────────────────────────────────────────

interface AlertRowActionsProps {
  alert: AlertRecord
  onEdit: (alert: AlertRecord) => void
  onDelete: (alert: AlertRecord) => void
}

function AlertRowActions({ alert, onEdit, onDelete }: AlertRowActionsProps) {
  const updateMutation = useUpdateAlertMutation()

  const toggleActive = async () => {
    try {
      const result = await updateMutation.mutateAsync({ id: alert.id, isActive: !alert.isActive })
      toast.success(result.message ?? `Alert ${alert.isActive ? "paused" : "activated"}`)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="size-8 p-0">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onSelect={() => onEdit(alert)}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={toggleActive}
          disabled={updateMutation.isPending}
        >
          {alert.isActive ? (
            <>
              <PowerOff className="size-4" />
              Pause
            </>
          ) : (
            <>
              <Power className="size-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={() => onDelete(alert)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────

interface AlertsTableProps {
  alerts?: AlertRecord[]
  isLoading?: boolean
}

export function AlertsTable({ alerts: alertsProp, isLoading }: AlertsTableProps = {}) {
  const alertsQuery = useAlertsQuery()
  const deleteMutation = useDeleteAlertMutation()

  const [editingAlert, setEditingAlert] = React.useState<AlertRecord | null>(null)
  const [deletingAlert, setDeletingAlert] = React.useState<AlertRecord | null>(null)

  const handleDelete = async () => {
    if (!deletingAlert) return
    try {
      const result = await deleteMutation.mutateAsync(deletingAlert.id)
      toast.success(result.message ?? "Alert deleted")
      setDeletingAlert(null)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  const alerts = alertsProp ?? alertsQuery.data?.data ?? []
  const loading = isLoading ?? alertsQuery.isLoading

  return (
    <>
      {alerts.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No alerts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create an alert to get notified when something goes wrong.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="w-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => {
                const lastTriggeredAt = alert.triggers?.[0]?.createdAt ?? null

                return (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {TYPE_LABEL[alert.type] ?? alert.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={alert.severity} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {alert.endpoint?.name ?? "All endpoints"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.isActive ? "default" : "outline"}>
                        {alert.isActive ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formatLastTriggered(lastTriggeredAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertRowActions
                        alert={alert}
                        onEdit={setEditingAlert}
                        onDelete={setDeletingAlert}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit dialog */}
      {editingAlert && (
        <AlertEditDialog
          alert={editingAlert}
          open={Boolean(editingAlert)}
          onOpenChange={(open) => !open && setEditingAlert(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={Boolean(deletingAlert)}
        onOpenChange={(open) => !open && setDeletingAlert(null)}
        entityName="Alert"
        entityLabel={deletingAlert?.name}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  )
}
