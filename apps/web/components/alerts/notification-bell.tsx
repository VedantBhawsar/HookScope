"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@hookscope/ui/components/badge"
import { Button } from "@hookscope/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@hookscope/ui/components/popover"
import { useAlertHistoryQuery } from "@/hooks/use-alerts"
import {
  useAlertStream,
  type AlertTriggeredEvent,
} from "@/hooks/use-alert-stream"

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function SeverityBadge({
  severity,
}: {
  severity: AlertTriggeredEvent["severity"]
}) {
  const variant =
    severity === "CRITICAL"
      ? "destructive"
      : severity === "WARNING"
        ? "secondary"
        : "outline"
  return <Badge variant={variant}>{severity}</Badge>
}

export function NotificationBell() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [recentAlerts, setRecentAlerts] = React.useState<AlertTriggeredEvent[]>(
    []
  )
  const historyQuery = useAlertHistoryQuery({ page: 1, limit: 20 })
  const match = pathname.match(/^\/dashboard\/([^/]+)\/([^/]+)(?:\/|$)/)

  const onAlert = React.useCallback((event: AlertTriggeredEvent) => {
    setRecentAlerts((prev) => [event, ...prev].slice(0, 5))
    setUnreadCount((prev) => prev + 1)

    const title = event.alertName
    const description = `${event.message}`

    if (event.severity === "CRITICAL") {
      toast.error(title, { description })
      return
    }

    if (event.severity === "WARNING") {
      toast.warning(title, { description })
      return
    }

    toast.info(title, { description })
  }, [])

  useAlertStream(onAlert)

  const historyBaseHref = React.useMemo(() => {
    if (match) {
      return `/dashboard/${match[1]}/${match[2]}/alerts?tab=history`
    }
    return "/dashboard"
  }, [match])

  const managedBaseHref = React.useMemo(() => {
    if (match) {
      return `/dashboard/${match[1]}/${match[2]}/alerts?tab=managed`
    }
    return "/dashboard"
  }, [match])

  const getTriggerHref = React.useCallback(
    (triggerId: string) =>
      historyBaseHref.includes("?")
        ? `${historyBaseHref}&triggerId=${triggerId}`
        : historyBaseHref,
    [historyBaseHref]
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) setUnreadCount(0)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Alert notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="text-destructive-foreground absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <PopoverHeader className="border-b px-4 py-3">
          <PopoverTitle>Notifications</PopoverTitle>
          <PopoverDescription>Latest triggered alerts</PopoverDescription>
        </PopoverHeader>

        <div className="max-h-80 overflow-y-auto">
          {(historyQuery.data?.data?.length ?? 0) === 0 &&
          recentAlerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No alerts yet
            </div>
          ) : (
            <ul>
              {(historyQuery.data?.data ?? []).slice(0, 10).map((trigger) => (
                <li
                  key={trigger.id}
                  className="border-b px-4 py-3 last:border-b-0"
                >
                  <Link href={getTriggerHref(trigger.id)} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-medium">
                        {trigger.alert.name}
                      </p>
                      <SeverityBadge severity={trigger.alert.severity} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {trigger.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTimestamp(trigger.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {match
          ? match[1] &&
            match[2] && (
              <div className="flex justify-between border-t px-4 py-2">
                <Link
                  href={historyBaseHref}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  All notifications
                </Link>
                <Link
                  href={managedBaseHref}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Manage alerts
                </Link>
              </div>
            )
          : <div className="border-t"></div>}
      </PopoverContent>
    </Popover>
  )
}
