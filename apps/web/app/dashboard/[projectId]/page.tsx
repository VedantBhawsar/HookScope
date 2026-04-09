"use client"

import { useDashboardProjectContext } from "@/components/dashboard/dashboard-project-context"

export default function ProjectDashboardPage() {
  const { selectedProject, isLoading } = useDashboardProjectContext()

  if (isLoading && !selectedProject) {
    return (
      <section className="space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">Loading projects...</h1>
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

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overview</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">{selectedProject.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This dashboard is now scoped through route params. Next we can plug in deliveries, event stream, and
          analytics modules.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stat Block</p>
            <div className="mt-4 h-8 w-24 rounded-md bg-muted" />
            <div className="mt-3 h-3 w-32 rounded-md bg-muted/70" />
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Primary Container</p>
          <div className="mt-4 h-64 rounded-xl border border-dashed border-border bg-muted/20" />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Secondary Container</p>
          <div className="mt-4 h-64 rounded-xl border border-dashed border-border bg-muted/20" />
        </section>
      </div>
    </section>
  )
}
