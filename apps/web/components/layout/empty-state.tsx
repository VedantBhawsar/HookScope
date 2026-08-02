import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@hookscope/ui/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-16 text-center", className)}>
      {Icon ? (
        <div className="flex size-12 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
          <Icon className="size-5 text-muted-foreground/60" />
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mx-auto mt-0.5 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
