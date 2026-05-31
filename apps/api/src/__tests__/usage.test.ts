import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"
import { authCookie } from "./helpers/auth"

const app = createApp()

const reset = () => Object.values(mocks.usage).forEach((m) => m.mockReset())

describe("GET /api/usage", () => {
  beforeEach(reset)

  it("returns usage data for authenticated user → 200", async () => {
    mocks.usage.getCurrentMonthUsage.mockResolvedValue({ eventCount: 42 })
    mocks.usage.getPlanForUser.mockResolvedValue(null) // free tier
    mocks.usage.getActiveEndpointCount.mockResolvedValue(1)
    const res = await request(app).get("/api/usage").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({
      plan: { tier: "FREE" },
      endpoints: { used: 1 },
    })
  })

  it("returns zero eventCount when no usage row exists yet", async () => {
    mocks.usage.getCurrentMonthUsage.mockResolvedValue(null)
    mocks.usage.getPlanForUser.mockResolvedValue(null)
    mocks.usage.getActiveEndpointCount.mockResolvedValue(0)
    const res = await request(app).get("/api/usage").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.eventCount).toBe(0)
  })

  it("returns paid plan limits when user has active subscription", async () => {
    mocks.usage.getCurrentMonthUsage.mockResolvedValue({ eventCount: 5000 })
    mocks.usage.getPlanForUser.mockResolvedValue({
      plan: { tier: "DEVELOPER", eventsPerMonth: 100000, endpointLimit: 10, retentionDays: 30 },
    })
    mocks.usage.getActiveEndpointCount.mockResolvedValue(4)
    const res = await request(app).get("/api/usage").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.plan.tier).toBe("DEVELOPER")
    expect(res.body.data.plan.endpointLimit).toBe(10)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/usage")
    expect(res.status).toBe(401)
  })

  it("rejects invalid JWT cookie → 401", async () => {
    const res = await request(app).get("/api/usage").set("Cookie", "at=bad.jwt.token")
    expect(res.status).toBe(401)
  })
})
