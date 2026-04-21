"use client"

import { useEffect, useState } from "react"
import { Timer } from "lucide-react"

const DURATION_MS = 23 * 60 * 60 * 1000 + 47 * 60 * 1000 // 23h 47m

function getOrInitEndTime(): number {
  try {
    const stored = sessionStorage.getItem("hookscope_offer_end")
    if (stored) {
      const end = parseInt(stored, 10)
      if (end > Date.now()) return end
    }
    const end = Date.now() + DURATION_MS
    sessionStorage.setItem("hookscope_offer_end", String(end))
    return end
  } catch {
    return Date.now() + DURATION_MS
  }
}

function formatRemaining(ms: number) {
  if (ms <= 0) return { h: "00", m: "00", s: "00" }
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  }
}

export function PricingTimer() {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const end = getOrInitEndTime()
    const tick = () => setRemaining(Math.max(0, end - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (remaining === null) return null

  const { h, m, s } = formatRemaining(remaining)

  return (
    <div className="flex items-center justify-center gap-2.5 rounded-full border border-destructive/30 bg-destructive/5 px-5 py-2 text-sm">
      <Timer className="size-4 text-destructive shrink-0" />
      <span className="text-destructive font-medium">Launch offer ends in</span>
      <div className="flex items-center gap-1 font-mono font-bold text-destructive">
        <span className="rounded bg-destructive/10 px-1.5 py-0.5">{h}</span>
        <span className="opacity-60">:</span>
        <span className="rounded bg-destructive/10 px-1.5 py-0.5">{m}</span>
        <span className="opacity-60">:</span>
        <span className="rounded bg-destructive/10 px-1.5 py-0.5">{s}</span>
      </div>
    </div>
  )
}
