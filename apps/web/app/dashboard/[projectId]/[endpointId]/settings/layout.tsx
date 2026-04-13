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
    title: "Endpoint Settings",
    description: "Configure delivery behavior, verification, and destination details for this endpoint.",
    path: `/dashboard/${projectId}/${endpointId}/settings`,
    noIndex: true,
  })
}

export default function EndpointSettingsLayout({ children }: { children: ReactNode }) {
  return children
}