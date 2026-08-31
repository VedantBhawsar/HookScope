import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createPageMetadata } from "./metadata"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Integrations } from "@/components/landing/integrations"
import { Features } from "@/components/landing/features"
import { FAQ } from "@/components/landing/faq"
import { CTA } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"

export const metadata = createPageMetadata({
  title: "HookScope — Webhook Observability",
  description: "Capture, inspect, and replay every webhook event in real time.",
  path: "/",
})

export default async function Page() {
  const cookieStore = await cookies()
  const hasSessionCookie = Boolean(cookieStore.get("at")?.value || cookieStore.get("rt")?.value)

  if (hasSessionCookie) {
    redirect("/projects")
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        backgroundColor: "var(--ink)",
        color: "var(--text)",
        fontFamily: "var(--font-sans, sans-serif)",
      }}
    >
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Integrations />
        <Features />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
