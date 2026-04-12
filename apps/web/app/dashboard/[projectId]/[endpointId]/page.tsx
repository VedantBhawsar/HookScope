"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  PauseCircle,
  ShieldCheck,
  Webhook,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"
import { EventStatusBadge } from "@/components/events/event-status-badge"
import {
  useEndpointDetailQuery,
  useToggleEndpointStatusMutation,
} from "@/hooks/use-endpoints"
import { useWebhookEventsQuery } from "@/hooks/use-webhook-events"
import { getRequestErrorMessage } from "@/lib/http"

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground/60" />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </article>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ProjectDashboardPage() {
  const { selectedProject, isLoading: projectLoading } = useDashboardProjectContext()
  const routeParams = useParams<{ projectId?: string; endpointId?: string }>()
  const projectId = typeof routeParams.projectId === "string" ? routeParams.projectId : null
  const endpointId = typeof routeParams.endpointId === "string" ? routeParams.endpointId : null

  const endpointQuery = useEndpointDetailQuery(projectId, endpointId)
  const endpoint = endpointQuery.data

  const recentEventsQuery = useWebhookEventsQuery({
    endpointId: endpointId ?? undefined,
    page: 1,
    limit: 5,
  })
  const recentEvents = recentEventsQuery.data?.data ?? []

  const toggleStatus = useToggleEndpointStatusMutation()

  async function handleToggleStatus() {
    if (!projectId || !endpointId || !endpoint) return
    const next = endpoint.status === "ACTIVE" ? "PAUSED" : "ACTIVE"
    try {
      const { message } = await toggleStatus.mutateAsync({
        projectId,
        endpointId,
        status: next,
      })
      toast.success(message ?? `Endpoint ${next.toLowerCase()}`)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  if (projectLoading && !selectedProject) {
    return (
      <section className="space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
          <div className="mt-2 h-8 w-48 rounded-lg bg-muted" />
        </header>
      </section>
    )
  }

  if (!selectedProject) {
    return (
      <section className="space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Project not found</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This project is unavailable. Return to the project workspace and select another project.
          </p>
        </header>
      </section>
    )
  }

  const isActive = endpoint?.status === "ACTIVE"

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold">
              {endpoint?.name ?? selectedProject.name}
            </h1>
            {endpoint && (
              <p className="mt-1 text-sm text-muted-foreground">
                {endpoint.source} · {endpoint.destinationUrl}
              </p>
            )}
          </div>
          {endpoint && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={toggleStatus.isPending}
              className="shrink-0"
            >
              {toggleStatus.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : isActive ? (
                <PauseCircle className="size-4" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {isActive ? "Pause" : "Activate"}
            </Button>
          )}
        </div>
      </header>

      {/* Stat cards */}
      {endpointQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <article key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="mt-4 h-8 w-16 rounded bg-muted" />
            </article>
          ))}
        </div>
      ) : endpoint ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Events"
            value={endpoint._count.events.toLocaleString()}
            icon={Webhook}
          />
          <StatCard
            label="Status"
            value={isActive ? "Active" : "Paused"}
            icon={isActive ? CheckCircle2 : PauseCircle}
          />
          <StatCard label="Source" value={endpoint.source} icon={Activity} />
          <StatCard
            label="Verification"
            value={endpoint.verificationMode}
            icon={ShieldCheck}
          />
        </div>
      ) : null}

      {/* Recent events */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Recent Events
          </p>
          {projectId && endpointId && (
            <Link
              href={`/dashboard/${projectId}/${endpointId}/events`}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>

        {recentEventsQuery.isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading…
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
            <Webhook className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No events yet</p>
            <p className="max-w-xs text-xs text-muted-foreground/70">
              Events will appear here once your endpoint starts receiving webhooks.
            </p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <EventStatusBadge status={event.status} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {event.eventId.length > 20
                      ? `${event.eventId.slice(0, 20)}…`
                      : event.eventId}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">{event.eventType ?? "—"}</span>
                  <span>{formatDate(event.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
