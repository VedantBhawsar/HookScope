"use client"

import { useEffect } from "react"
import type { AlertSeverity, AlertType } from "@/hooks/use-alerts"

export interface AlertTriggeredEvent {
  triggerId: string
  alertId: string
  alertName: string
  severity: AlertSeverity
  message: string
  endpointId?: string | null
  triggeredAt: string
  type?: AlertType
}

const API_URL = process.env["NEXT_PUBLIC_API_URL"]?.replace(/\/$/, "") ?? ""

export function useAlertStream(onAlert: (event: AlertTriggeredEvent) => void) {
  useEffect(() => {
    if (!API_URL) return

    const es = new EventSource(`${API_URL}/api/alerts/stream`, {
      withCredentials: true,
    } as EventSourceInit)

    es.addEventListener("alert_triggered", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as AlertTriggeredEvent
        onAlert(data)
      } catch {
        console.warn("[useAlertStream] Failed to parse alert event", e.data)
      }
    })

    es.addEventListener("connected", () => {
      console.debug("[useAlertStream] SSE connection established")
    })

    es.addEventListener("ping", () => {
      // Keepalive event from server/comment heartbeat path.
    })

    es.onerror = () => {
      // EventSource auto-reconnects on error — no manual handling needed
    }

    return () => {
      es.close()
    }
    // onAlert is intentionally excluded — wrap it in useCallback at the call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
