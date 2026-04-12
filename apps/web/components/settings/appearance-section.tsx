"use client"

import { ThemeToggle } from "@/components/theme-toggle"

export function AppearanceSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Appearance</h2>
      <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </section>
  )
}
