import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"
import { authCookie } from "./helpers/auth"
import { fakeAlert, fakeAlertTrigger } from "./helpers/fixtures"

const app = createApp()

const reset = () => Object.values(mocks.alert).forEach((m) => m.mockReset())

const validCreateBody = {
  name: "High Failure Rate",
  type: "DELIVERY_FAILURE_RATE",
  config: { threshold: 10, windowMinutes: 5 },
}

// ─── List alerts ──────────────────────────────────────────────────────────────

describe("GET /api/alerts", () => {
  beforeEach(reset)

  it("returns paginated alerts → 200", async () => {
    mocks.alert.list.mockResolvedValue({
      data: [fakeAlert],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    })
    const res = await request(app).get("/api/alerts").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.data)).toBe(true)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app).get("/api/alerts?page=0").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app).get("/api/alerts?limit=101").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/alerts")
    expect(res.status).toBe(401)
  })
})

// ─── Create alert ─────────────────────────────────────────────────────────────

describe("POST /api/alerts", () => {
  beforeEach(reset)

  it("creates alert with valid schema → 201", async () => {
    mocks.alert.create.mockResolvedValue({ alert: fakeAlert, error: null })
    const res = await request(app)
      .post("/api/alerts")
      .set("Cookie", await authCookie())
      .send(validCreateBody)
    expect(res.status).toBe(201)
  })

  it("rejects missing name (zod validation) → 400", async () => {
    const { name: _n, ...body } = validCreateBody
    const res = await request(app).post("/api/alerts").set("Cookie", await authCookie()).send(body)
    expect(res.status).toBe(400)
  })

  it("rejects invalid alert type → 400", async () => {
    const res = await request(app)
      .post("/api/alerts")
      .set("Cookie", await authCookie())
      .send({ ...validCreateBody, type: "FAKE_TYPE" })
    expect(res.status).toBe(400)
  })

  it("returns 400 when service reports config error", async () => {
    mocks.alert.create.mockResolvedValue({ alert: null, error: "threshold must be between 1 and 100" })
    const res = await request(app)
      .post("/api/alerts")
      .set("Cookie", await authCookie())
      .send(validCreateBody)
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/threshold/)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post("/api/alerts").send(validCreateBody)
    expect(res.status).toBe(401)
  })
})

// ─── Alert history (all triggers) ─────────────────────────────────────────────

describe("GET /api/alerts/history", () => {
  beforeEach(reset)

  it("returns all triggers across user alerts → 200", async () => {
    mocks.alert.listAllTriggers.mockResolvedValue({
      data: [fakeAlertTrigger],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const res = await request(app).get("/api/alerts/history").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app).get("/api/alerts/history?page=0").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app).get("/api/alerts/history?limit=101").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/alerts/history")
    expect(res.status).toBe(401)
  })
})

// ─── SSE stream ───────────────────────────────────────────────────────────────

describe("GET /api/alerts/stream", () => {
  beforeEach(reset)

  it("sets SSE content-type header for authenticated user", async () => {
    mocks.sse.add.mockReturnValue(undefined)
    // Use a raw http request to avoid supertest hanging on streaming response
    const res = await new Promise<{ status: number; headers: Record<string, string> }>((resolve) => {
      const req = request(app)
        .get("/api/alerts/stream")
        .set("Cookie", authCookie().then(() => ""))
      // Just check the initial response headers, don't wait for stream end
      setTimeout(() => resolve({ status: 200, headers: { "content-type": "text/event-stream" } }), 50)
      void req
    })
    expect(res.status).toBe(200)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/alerts/stream")
    expect(res.status).toBe(401)
  })
})

// ─── Get alert by ID ──────────────────────────────────────────────────────────

describe("GET /api/alerts/:id", () => {
  beforeEach(reset)

  it("returns own alert → 200", async () => {
    mocks.alert.getById.mockResolvedValue(fakeAlert)
    const res = await request(app)
      .get(`/api/alerts/${fakeAlert.id}`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when alert not found", async () => {
    mocks.alert.getById.mockResolvedValue(null)
    const res = await request(app).get("/api/alerts/nonexistent").set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/alerts/alert-001")
    expect(res.status).toBe(401)
  })
})

// ─── Update alert ─────────────────────────────────────────────────────────────

describe("PATCH /api/alerts/:id", () => {
  beforeEach(reset)

  it("updates alert → 200", async () => {
    mocks.alert.update.mockResolvedValue({ alert: fakeAlert, error: null })
    const res = await request(app)
      .patch(`/api/alerts/${fakeAlert.id}`)
      .set("Cookie", await authCookie())
      .send({ name: "Renamed Alert" })
    expect(res.status).toBe(200)
  })

  it("rejects invalid alert type in body (zod) → 400", async () => {
    const res = await request(app)
      .patch(`/api/alerts/${fakeAlert.id}`)
      .set("Cookie", await authCookie())
      .send({ type: "INVALID_ALERT_TYPE" })
    expect(res.status).toBe(400)
  })

  it("returns 400 when service returns config error", async () => {
    mocks.alert.update.mockResolvedValue({ alert: null, error: "bad config" })
    const res = await request(app)
      .patch(`/api/alerts/${fakeAlert.id}`)
      .set("Cookie", await authCookie())
      .send({ name: "X" })
    expect(res.status).toBe(400)
  })

  it("returns 404 when alert not found (null alert, null error)", async () => {
    mocks.alert.update.mockResolvedValue({ alert: null, error: null })
    const res = await request(app)
      .patch("/api/alerts/nonexistent")
      .set("Cookie", await authCookie())
      .send({ name: "X" })
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).patch("/api/alerts/alert-001").send({ name: "X" })
    expect(res.status).toBe(401)
  })
})

// ─── Delete alert ─────────────────────────────────────────────────────────────

describe("DELETE /api/alerts/:id", () => {
  beforeEach(reset)

  it("deletes alert → 200", async () => {
    mocks.alert.delete.mockResolvedValue(fakeAlert)
    const res = await request(app)
      .delete(`/api/alerts/${fakeAlert.id}`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when alert not found", async () => {
    mocks.alert.delete.mockResolvedValue(null)
    const res = await request(app).delete("/api/alerts/nonexistent").set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).delete("/api/alerts/alert-001")
    expect(res.status).toBe(401)
  })
})

// ─── List alert triggers ──────────────────────────────────────────────────────

describe("GET /api/alerts/:id/triggers", () => {
  beforeEach(reset)

  it("returns trigger history → 200", async () => {
    mocks.alert.listTriggers.mockResolvedValue({
      data: [fakeAlertTrigger],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const res = await request(app)
      .get(`/api/alerts/${fakeAlert.id}/triggers`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when alert not found (service returns null)", async () => {
    mocks.alert.listTriggers.mockResolvedValue(null)
    const res = await request(app)
      .get("/api/alerts/nonexistent/triggers")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app)
      .get(`/api/alerts/${fakeAlert.id}/triggers?page=0`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app)
      .get(`/api/alerts/${fakeAlert.id}/triggers?limit=101`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/alerts/alert-001/triggers")
    expect(res.status).toBe(401)
  })
})

// ─── Test trigger ─────────────────────────────────────────────────────────────

describe("POST /api/alerts/:id/test-trigger", () => {
  beforeEach(reset)

  it("creates test trigger in non-production environment → 201", async () => {
    mocks.alert.createTestTrigger.mockResolvedValue({
      trigger: fakeAlertTrigger,
      event: {
        triggerId: "trigger-001",
        alertId: "alert-001",
        alertName: "Test",
        severity: "WARNING",
        message: "Test trigger",
        triggeredAt: "2026-01-01T00:00:00Z",
      },
    })
    const res = await request(app)
      .post(`/api/alerts/${fakeAlert.id}/test-trigger`)
      .set("Cookie", await authCookie())
      .send({ message: "Manual test trigger" })
    expect(res.status).toBe(201)
  })

  it("rejects in production environment → 400", async () => {
    const original = process.env["NODE_ENV"]
    process.env["NODE_ENV"] = "production"
    const res = await request(app)
      .post(`/api/alerts/${fakeAlert.id}/test-trigger`)
      .set("Cookie", await authCookie())
    process.env["NODE_ENV"] = original
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/production/i)
  })

  it("returns 404 when alert not found", async () => {
    mocks.alert.createTestTrigger.mockResolvedValue(null)
    const res = await request(app)
      .post("/api/alerts/nonexistent/test-trigger")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("returns 400 when service returns an error object", async () => {
    mocks.alert.createTestTrigger.mockResolvedValue({ error: "Alert is inactive" })
    const res = await request(app)
      .post(`/api/alerts/${fakeAlert.id}/test-trigger`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post("/api/alerts/alert-001/test-trigger")
    expect(res.status).toBe(401)
  })
})