import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createPageMetadata } from "./metadata"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import { Features } from "@/components/landing/features"
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
      className="crt-scanlines crt-flicker"
      style={{
        minHeight: "100svh",
        backgroundColor: "#050a05",
        color: "#c8d5c8",
        fontFamily: "var(--font-display, monospace)",
      }}
    >
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
