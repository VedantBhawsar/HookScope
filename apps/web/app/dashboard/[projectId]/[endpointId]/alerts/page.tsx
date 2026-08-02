"use client"

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { Badge } from "@hookscope/ui/components/badge"
import { Bell } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hookscope/ui/components/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hookscope/ui/components/table"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { useEndpointsQuery } from "@/hooks/use-endpoints"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import {
  useAlertsQuery,
  useAlertHistoryQuery,
  type AlertTriggerWithAlert,
} from "@/hooks/use-alerts"
import { AlertCreateDialog } from "@/components/alerts/alert-create-dialog"
import { AlertsTable } from "@/components/alerts/alerts-table"
import { AlertTriggerDetailSheet } from "@/components/alerts/alert-trigger-detail-sheet"

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function SeverityBadge({ severity }: { severity: "INFO" | "WARNING" | "CRITICAL" }) {
  const variant = severity === "CRITICAL" ? "destructive" : severity === "WARNING" ? "secondary" : "outline"
  return <Badge variant={variant}>{severity}</Badge>
}

export default function EndpointAlertsPage() {
  const routeParams = useParams<{ endpointId?: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const endpointId =
    typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const { selectedProject } = useDashboardProjectContext()
  const endpointsQuery = useEndpointsQuery(selectedProject?.id ?? null)
  const endpoints = endpointsQuery.data?.data ?? []

  const endpoint = React.useMemo(
    () => endpoints.find((item) => item.id === endpointId) ?? null,
    [endpointId, endpoints]
  )

  const alertsQuery = useAlertsQuery({ page: 1, limit: 100 })
  const historyQuery = useAlertHistoryQuery({ page: 1, limit: 100 })
  const tab = searchParams.get("tab") === "history" ? "history" : "rules"
  const selectedTriggerId = searchParams.get("triggerId")
  const [selectedTrigger, setSelectedTrigger] = React.useState<AlertTriggerWithAlert | null>(null)

  const clearTriggerIdFromUrl = React.useCallback(() => {
    if (!searchParams.get("triggerId")) return
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("triggerId")
    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }, [pathname, router, searchParams])

  const endpointAlerts = React.useMemo(() => {
    const list = alertsQuery.data?.data ?? []
    if (!endpointId) return list
    return list.filter((alert) => alert.endpointId === null || alert.endpointId === endpointId)
  }, [alertsQuery.data?.data, endpointId])

  const historyRows = React.useMemo(() => {
    const list = historyQuery.data?.data ?? []
    if (!endpointId) return list
    return list.filter((trigger) => {
      const metadata = trigger.metadata ?? {}
      const metadataEndpointId = metadata["endpointId"]
      if (typeof metadataEndpointId !== "string") return true
      return metadataEndpointId === endpointId
    })
  }, [endpointId, historyQuery.data?.data])

  React.useEffect(() => {
    if (!selectedTriggerId) return
    const match = historyRows.find((trigger) => trigger.id === selectedTriggerId)
    if (!match) return
    setSelectedTrigger(match)
    clearTriggerIdFromUrl()
  }, [clearTriggerIdFromUrl, historyRows, selectedTriggerId])

  const handleTabChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (value === "history") {
      nextParams.set("tab", "history")
    } else {
      nextParams.delete("tab")
      nextParams.delete("triggerId")
      setSelectedTrigger(null)
    }
    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        label="Alerts"
        title={endpoint?.name ?? "Alerts"}
        description="Manage alert rules and inspect triggered notifications for this endpoint."
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="history">Logs</TabsTrigger>
            </TabsList>

            {tab === "rules" ? <AlertCreateDialog /> : null}
          </div>

          <TabsContent value="rules" className="mt-4">
            {endpointAlerts.length === 0 && !alertsQuery.isLoading ? (
              <EmptyState
                icon={Bell}
                title="No alerts configured"
                description="Create an alert rule to get notified about delivery failures and critical events."
              />
            ) : (
              <AlertsTable alerts={endpointAlerts} isLoading={alertsQuery.isLoading} />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {historyRows.length === 0 && !historyQuery.isLoading ? (
              <EmptyState
                icon={Bell}
                title="No trigger history yet"
                description="Triggered alerts will appear here."
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Triggered At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRows.map((trigger) => (
                      <TableRow
                        key={trigger.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedTrigger(trigger)}
                      >
                        <TableCell className="font-medium">{trigger.alert.name}</TableCell>
                        <TableCell>
                          <SeverityBadge severity={trigger.alert.severity} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {trigger.alert.type}
                        </TableCell>
                        <TableCell className="max-w-xl text-sm text-muted-foreground">
                          {trigger.message}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimestamp(trigger.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertTriggerDetailSheet
        trigger={selectedTrigger}
        onClose={() => {
          setSelectedTrigger(null)
          clearTriggerIdFromUrl()
        }}
      />
    </section>
  )
}
