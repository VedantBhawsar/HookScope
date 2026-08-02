"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  FolderKanban,
  LoaderCircle,
  Search,
  Settings as SettingsIcon,
  Webhook,
} from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@hookscope/ui/components/dialog"
import { Input } from "@hookscope/ui/components/input"
import { cn } from "@hookscope/ui/lib/utils"
import { useProjectsQuery, type ProjectRecord } from "@/hooks/use-projects"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const projectsQuery = useProjectsQuery({ limit: 100 })
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const projects = React.useMemo(
    () => projectsQuery.data?.data ?? [],
    [projectsQuery.data]
  )

  const staticItems: CommandItem[] = React.useMemo(
    () => [
      { id: "projects", label: "Projects", href: "/projects", icon: FolderKanban },
      { id: "billing", label: "Billing", href: "/billing", icon: CreditCard },
      { id: "settings", label: "Settings", href: "/settings", icon: SettingsIcon },
    ],
    []
  )

  const projectItems: CommandItem[] = React.useMemo(
    () =>
      projects.map((project: ProjectRecord) => ({
        id: `project-${project.id}`,
        label: project.name,
        sublabel: `${project.endpointCount} endpoint${project.endpointCount === 1 ? "" : "s"}`,
        href: `/dashboard/${project.id}`,
        icon: Webhook,
      })),
    [projects]
  )

  const items = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const match = (item: CommandItem) =>
      !normalized ||
      item.label.toLowerCase().includes(normalized) ||
      (item.sublabel ?? "").toLowerCase().includes(normalized)

    return [...staticItems.filter(match), ...projectItems.filter(match)]
  }, [query, staticItems, projectItems])

  React.useEffect(() => {
    if (!open) return
    setQuery("")
    setActiveIndex(0)
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [open])

  React.useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, items.length - 1)))
  }, [items.length])

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-command-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const runItem = (item: CommandItem) => {
    onOpenChange(false)
    router.push(item.href)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, items.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      const item = items[activeIndex]
      if (item) runItem(item)
    } else if (event.key === "Escape") {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="top-16 translate-y-0 p-0 sm:max-w-lg"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        <div className="border-b border-border">
          <label className="relative flex items-center gap-2 px-4">
            <Search className="size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects and pages..."
              className="h-12 border-0 bg-transparent px-0 text-sm outline-none focus-visible:ring-0"
            />
            <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </label>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {projectsQuery.isLoading && items.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading projects...
            </div>
          ) : null}

          {!projectsQuery.isLoading && items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </p>
          ) : null}

          {items.map((item, index) => {
            const Icon = item.icon
            const isActive = index === activeIndex
            return (
              <div
                key={item.id}
                data-command-index={index}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runItem(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-accent text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.label}</p>
                  {item.sublabel ? (
                    <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
                  ) : null}
                </div>
                {isActive ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="ml-auto hidden size-6 rounded border border-border p-0 sm:inline-flex"
                  >
                    <Link href={item.href} tabIndex={-1} />
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
