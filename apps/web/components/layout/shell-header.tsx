"use client"

import Link from "next/link"
import * as React from "react"
import { ChevronRight, Menu, Search } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import { NotificationBell } from "@/components/alerts/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@hookscope/ui/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface ShellHeaderProps {
  crumbs: BreadcrumbItem[]
  onOpenMobileNav: () => void
  onOpenCommandPalette: () => void
}

export function ShellHeader({ crumbs, onOpenMobileNav, onOpenCommandPalette }: ShellHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 lg:hidden"
            onClick={onOpenMobileNav}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 ? (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                  ) : null}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="truncate text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        "truncate font-heading font-semibold",
                        !isLast && "text-muted-foreground"
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-muted-foreground"
            onClick={onOpenCommandPalette}
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-normal sm:inline">
              ⌘K
            </kbd>
          </Button>
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
