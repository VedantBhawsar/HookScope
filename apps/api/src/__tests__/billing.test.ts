/**
 * Billing route tests.
 * NOTE: POST /api/billing/webhook (Stripe) is intentionally skipped —
 * migrating to Dodo Payments; tests will be added after the migration.
 */
import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"
import { authCookie } from "./helpers/auth"
import { fakeSubscription } from "./helpers/fixtures"

const app = createApp()

const reset = () => Object.values(mocks.billing).forEach((m) => m.mockReset())

// ─── Create checkout session ──────────────────────────────────────────────────

describe("POST /api/billing/checkout", () => {
  beforeEach(reset)

  it("returns checkout URL for valid plan + interval → 200", async () => {
    mocks.billing.createCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_xxx" })
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "developer", interval: "monthly" })
    expect(res.status).toBe(200)
    expect(res.body.data.url).toContain("stripe.com")
  })

  it("accepts annual interval → 200", async () => {
    mocks.billing.createCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_annual" })
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "pro", interval: "annual" })
    expect(res.status).toBe(200)
  })

  it("accepts enterprise plan → 200", async () => {
    mocks.billing.createCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_enterprise" })
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "enterprise", interval: "monthly" })
    expect(res.status).toBe(200)
  })

  it("rejects invalid planId → 400", async () => {
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "free", interval: "monthly" })
    expect(res.status).toBe(400)
  })

  it("rejects invalid interval → 400", async () => {
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "developer", interval: "weekly" })
    expect(res.status).toBe(400)
  })

  it("rejects missing planId → 400", async () => {
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ interval: "monthly" })
    expect(res.status).toBe(400)
  })

  it("rejects missing interval → 400", async () => {
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "developer" })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app)
      .post("/api/billing/checkout")
      .send({ planId: "developer", interval: "monthly" })
    expect(res.status).toBe(401)
  })

  it("returns 500 when service throws", async () => {
    mocks.billing.createCheckoutSession.mockRejectedValue(new Error("Stripe error"))
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "developer", interval: "monthly" })
    expect(res.status).toBe(500)
  })
})

// ─── Create portal session ────────────────────────────────────────────────────

describe("POST /api/billing/portal", () => {
  beforeEach(reset)

  it("returns portal URL for authenticated user → 200", async () => {
    mocks.billing.createPortalSession.mockResolvedValue({ url: "https://billing.stripe.com/p/session_test" })
    const res = await request(app)
      .post("/api/billing/portal")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.url).toContain("stripe.com")
  })

  it("returns 500 when no billing account found", async () => {
    // Use mockImplementation (not mockRejectedValue) to avoid Bun's unhandled rejection tracking
    mocks.billing.createPortalSession.mockImplementation(async () => {
      throw new Error("No billing account found. Complete checkout first.")
    })
    const res = await request(app)
      .post("/api/billing/portal")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(500)
    expect(res.body.message).toMatch(/billing account/i)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post("/api/billing/portal")
    expect(res.status).toBe(401)
  })
})

// ─── Change plan ──────────────────────────────────────────────────────────────

describe("POST /api/billing/change-plan", () => {
  beforeEach(reset)

  it("changes plan with valid input → 200", async () => {
    mocks.billing.changePlan.mockResolvedValue({ message: "Plan updated to pro (annual)" })
    const res = await request(app)
      .post("/api/billing/change-plan")
      .set("Cookie", await authCookie())
      .send({ planId: "pro", interval: "annual" })
    expect(res.status).toBe(200)
  })

  it("rejects invalid planId → 400", async () => {
    const res = await request(app)
      .post("/api/billing/change-plan")
      .set("Cookie", await authCookie())
      .send({ planId: "startup", interval: "monthly" })
    expect(res.status).toBe(400)
  })

  it("rejects invalid interval → 400", async () => {
    const res = await request(app)
      .post("/api/billing/change-plan")
      .set("Cookie", await authCookie())
      .send({ planId: "pro", interval: "quarterly" })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app)
      .post("/api/billing/change-plan")
      .send({ planId: "pro", interval: "monthly" })
    expect(res.status).toBe(401)
  })
})

// ─── Get subscription ─────────────────────────────────────────────────────────

describe("GET /api/billing/subscription", () => {
  beforeEach(reset)

  it("returns subscription data for authenticated user → 200", async () => {
    mocks.billing.getSubscription.mockResolvedValue(fakeSubscription)
    const res = await request(app)
      .get("/api/billing/subscription")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe("active")
  })

  it("returns null when user has no subscription → 200", async () => {
    mocks.billing.getSubscription.mockResolvedValue(null)
    const res = await request(app)
      .get("/api/billing/subscription")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data).toBeNull()
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/billing/subscription")
    expect(res.status).toBe(401)
  })
})
