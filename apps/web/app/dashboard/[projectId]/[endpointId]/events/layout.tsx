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
    title: "Events",
    description: "Inspect incoming webhook events for this endpoint and filter the event stream.",
    path: `/dashboard/${projectId}/${endpointId}/events`,
    noIndex: true,
  })
}

export default function EndpointEventsLayout({ children }: { children: ReactNode }) {
  return children
}