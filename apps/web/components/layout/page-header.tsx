import * as React from "react"
import { cn } from "@hookscope/ui/lib/utils"
import { SectionLabel } from "@/components/layout/section-label"

interface PageHeaderProps {
  label?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ label, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("rounded-xl border border-border bg-card p-6 shadow-sm", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {label ? <SectionLabel>{label}</SectionLabel> : null}
          <h1 className="mt-1.5 font-heading text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
