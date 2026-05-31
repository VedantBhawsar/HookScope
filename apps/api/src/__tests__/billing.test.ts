/**
 * Billing route tests — Dodo Payments integration.
 * Controller-layer tests: HTTP request/response contracts and auth guards.
 * Service-layer logic (status mapping, Dodo SDK calls) is verified by
 * integration against real Dodo test-mode credentials (see README).
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

  it("returns checkout URL for starter monthly → 200", async () => {
    mocks.billing.createCheckoutSession.mockResolvedValue({ url: "https://checkout.dodopayments.com/session/cs_test_xxx" })
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "starter", interval: "monthly" })
    expect(res.status).toBe(200)
    expect(res.body.data.url).toContain("dodopayments.com")
  })

  it("accepts pro plan annual interval → 200", async () => {
    mocks.billing.createCheckoutSession.mockResolvedValue({ url: "https://checkout.dodopayments.com/session/cs_annual" })
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "pro", interval: "annual" })
    expect(res.status).toBe(200)
  })

  it("rejects free planId (not a paid checkout plan) → 400", async () => {
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
      .send({ planId: "starter", interval: "weekly" })
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
      .send({ planId: "starter" })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app)
      .post("/api/billing/checkout")
      .send({ planId: "starter", interval: "monthly" })
    expect(res.status).toBe(401)
  })

  it("returns 500 when service throws → 500", async () => {
    mocks.billing.createCheckoutSession.mockRejectedValue(new Error("Dodo API error"))
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Cookie", await authCookie())
      .send({ planId: "starter", interval: "monthly" })
    expect(res.status).toBe(500)
  })
})

// ─── Create portal session ────────────────────────────────────────────────────

describe("POST /api/billing/portal", () => {
  beforeEach(reset)

  it("returns portal URL for authenticated user → 200", async () => {
    mocks.billing.createPortalSession.mockResolvedValue({ url: "https://customer-portal.dodopayments.com/p/session_test" })
    const res = await request(app)
      .post("/api/billing/portal")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.url).toContain("dodopayments.com")
  })

  it("returns 500 when no billing account found", async () => {
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

  it("changes to pro plan → 200", async () => {
    mocks.billing.changePlan.mockResolvedValue({ message: "Plan updated to pro (annual)" })
    const res = await request(app)
      .post("/api/billing/change-plan")
      .set("Cookie", await authCookie())
      .send({ planId: "pro", interval: "annual" })
    expect(res.status).toBe(200)
  })

  it("rejects invalid planId (enterprise removed) → 400", async () => {
    const res = await request(app)
      .post("/api/billing/change-plan")
      .set("Cookie", await authCookie())
      .send({ planId: "enterprise", interval: "monthly" })
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
    expect(res.body.data.tier).toBe("STARTER")
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

// ─── Dodo webhook endpoint ────────────────────────────────────────────────────

describe("POST /api/billing/webhook", () => {
  beforeEach(reset)

  const dodoHeaders = {
    "webhook-id":        "wh_test_123",
    "webhook-timestamp": "1748649600",
    "webhook-signature": "v1,dGVzdHNpZ25hdHVyZQ==",
  }

  it("calls handleWebhookEvent and returns {received:true} → 200", async () => {
    mocks.billing.handleWebhookEvent.mockResolvedValue(undefined)
    const res = await request(app)
      .post("/api/billing/webhook")
      .set(dodoHeaders)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "subscription.active", data: {} }))
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
    expect(mocks.billing.handleWebhookEvent).toHaveBeenCalledTimes(1)
  })

  it("passes all three Dodo headers to the service", async () => {
    mocks.billing.handleWebhookEvent.mockResolvedValue(undefined)
    await request(app)
      .post("/api/billing/webhook")
      .set(dodoHeaders)
      .set("Content-Type", "application/json")
      .send("{}")
    const [_body, headers] = mocks.billing.handleWebhookEvent.mock.calls[0]
    expect(headers["webhook-id"]).toBe("wh_test_123")
    expect(headers["webhook-timestamp"]).toBe("1748649600")
    expect(headers["webhook-signature"]).toBe("v1,dGVzdHNpZ25hdHVyZQ==")
  })

  it("returns 400 when webhook-id header is missing", async () => {
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("webhook-timestamp", "123")
      .set("webhook-signature", "v1,sig")
      .set("Content-Type", "application/json")
      .send("{}")
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Missing Dodo webhook headers/i)
    expect(mocks.billing.handleWebhookEvent).not.toHaveBeenCalled()
  })

  it("returns 400 when webhook-timestamp header is missing", async () => {
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("webhook-id", "wh_1")
      .set("webhook-signature", "v1,sig")
      .set("Content-Type", "application/json")
      .send("{}")
    expect(res.status).toBe(400)
  })

  it("returns 400 when webhook-signature header is missing", async () => {
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("webhook-id", "wh_1")
      .set("webhook-timestamp", "123")
      .set("Content-Type", "application/json")
      .send("{}")
    expect(res.status).toBe(400)
  })

  it("returns 400 when no headers are present at all", async () => {
    const res = await request(app)
      .post("/api/billing/webhook")
      .set("Content-Type", "application/json")
      .send("{}")
    expect(res.status).toBe(400)
  })

  it("returns 400 when signature verification fails (service throws)", async () => {
    mocks.billing.handleWebhookEvent.mockImplementation(async () => {
      throw new Error("Invalid signature")
    })
    const res = await request(app)
      .post("/api/billing/webhook")
      .set(dodoHeaders)
      .set("Content-Type", "application/json")
      .send("{}")
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/verification failed/i)
  })
})
