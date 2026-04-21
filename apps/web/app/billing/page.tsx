import type { Metadata } from "next"
import { createPageMetadata } from "@/app/metadata"
import { BillingWorkspace } from "@/components/billing/billing-workspace"

export const metadata: Metadata = createPageMetadata({
  title: "Billing",
  description: "Manage your subscription and payment details.",
  path: "/billing",
  noIndex: true,
})

export default function BillingPage() {
  return <BillingWorkspace />
}
