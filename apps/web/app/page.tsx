import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import { Features } from "@/components/landing/features"
import { CTA } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"

export default function Page() {
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
