import { PricingSection } from "@/components/pricing/pricing-section"
import { createPageMetadata } from "../metadata"

export const metadata = createPageMetadata({
  title: "Pricing",
  description: "Simple pricing for HookScope. Start free, scale as you grow.",
  path: "/pricing",
})

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
        <PricingSection />
      </div>
    </main>
  )
}
