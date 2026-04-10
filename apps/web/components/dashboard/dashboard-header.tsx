import { ThemeToggle } from "@/components/theme-toggle"

interface DashboardHeaderProps {
  title: string
  projectsErrorMessage: string | null
  logoutErrorMessage: string | null
}

export function DashboardHeader({ title, projectsErrorMessage, logoutErrorMessage }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dashboard</p>
          <p className="truncate font-heading text-lg font-semibold">{title}</p>
        </div>

        <ThemeToggle />
      </div>
      {projectsErrorMessage ? <p className="mx-auto mt-2 w-full text-xs text-destructive">{projectsErrorMessage}</p> : null}
      {logoutErrorMessage ? <p className="mx-auto mt-2 w-full text-xs text-destructive">{logoutErrorMessage}</p> : null}
    </header>
  )
}
