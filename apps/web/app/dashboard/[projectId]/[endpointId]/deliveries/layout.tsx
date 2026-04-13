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
    title: "Deliveries",
    description: "Review outbound delivery attempts and response history for this endpoint.",
    path: `/dashboard/${projectId}/${endpointId}/deliveries`,
    noIndex: true,
  })
}

export default function EndpointDeliveriesLayout({ children }: { children: ReactNode }) {
  return children
}