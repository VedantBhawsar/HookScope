import type { Metadata } from "next"
import type { ReactNode } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { createPageMetadata } from "@/app/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>
}): Promise<Metadata> {
  const { projectId } = await params

  return createPageMetadata({
    title: "Project Dashboard",
    description: "Open a project workspace and route into the active webhook endpoint dashboard.",
    path: `/dashboard/${projectId}`,
    noIndex: true,
  })
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}