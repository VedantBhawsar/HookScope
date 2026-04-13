import type { Metadata } from "next"
import type { ReactNode } from "react"
import { createPageMetadata, getCurrentCompanyName } from "@/app/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; endpointId: string }>
}): Promise<Metadata> {
  const { projectId, endpointId } = await params
  const companyName = await getCurrentCompanyName()

  return createPageMetadata({
    title: "Overview",
    absoluteTitle: companyName ? `Overview | ${companyName}` : undefined,
    description: "Monitor endpoint traffic, delivery health, and recent webhook activity.",
    path: `/dashboard/${projectId}/${endpointId}`,
    noIndex: true,
  })
}

export default function EndpointLayout({ children }: { children: ReactNode }) {
  return children
}