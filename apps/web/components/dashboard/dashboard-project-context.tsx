"use client"

import * as React from "react"
import type { ProjectRecord } from "@/hooks/use-projects"

export interface DashboardProjectContextValue {
  projects: ProjectRecord[]
  selectedProjectId: string | null
  selectedProject: ProjectRecord | null
  setSelectedProjectId: (projectId: string) => void
  isLoading: boolean
  errorMessage: string | null
}

const DashboardProjectContext = React.createContext<DashboardProjectContextValue | null>(null)

export function DashboardProjectProvider({
  value,
  children,
}: {
  value: DashboardProjectContextValue
  children: React.ReactNode
}) {
  return <DashboardProjectContext.Provider value={value}>{children}</DashboardProjectContext.Provider>
}

export function useDashboardProjectContext(): DashboardProjectContextValue {
  const context = React.useContext(DashboardProjectContext)

  if (!context) {
    throw new Error("useDashboardProjectContext must be used within DashboardProjectProvider")
  }

  return context
}
