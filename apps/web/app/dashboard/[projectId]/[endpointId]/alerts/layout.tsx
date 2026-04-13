import type { Metadata } from "next"
import type { ReactNode } from "react"
import { createPageMetadata } from "@/app/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; endpointId: string }>
}): Promise<Metadata> {
  const { projectId, endpointId } = await params

  return createPageMetadata({
    title: "Alerts",
    description: "Manage alert rules and review triggered notifications for this webhook endpoint.",
    path: `/dashboard/${projectId}/${endpointId}/alerts`,
    noIndex: true,
  })
}

export default function EndpointAlertsLayout({ children }: { children: ReactNode }) {
  return children
}