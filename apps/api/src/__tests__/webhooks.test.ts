import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"
import { authCookie } from "./helpers/auth"
import { fakeWebhookEvent, fakePaginatedEvents, fakeDelivery } from "./helpers/fixtures"

const app = createApp()

const reset = () => Object.values(mocks.webhook).forEach((m) => m.mockReset())

// ─── List events ──────────────────────────────────────────────────────────────

describe("GET /api/webhooks", () => {
  beforeEach(reset)

  it("returns paginated events for authenticated user → 200", async () => {
    mocks.webhook.listByUser.mockResolvedValue(fakePaginatedEvents)
    const res = await request(app).get("/api/webhooks").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.data)).toBe(true)
  })

  it("accepts all filter query params → 200", async () => {
    mocks.webhook.listByUser.mockResolvedValue(fakePaginatedEvents)
    const res = await request(app)
      .get("/api/webhooks?status=DELIVERED&source=GITHUB&eventType=push&search=abc&projectId=p1&endpointId=e1")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects invalid ?status → 400", async () => {
    const res = await request(app)
      .get("/api/webhooks?status=INVALID_STATUS")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects invalid ?source → 400", async () => {
    const res = await request(app)
      .get("/api/webhooks?source=MADE_UP")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app).get("/api/webhooks?page=0").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app).get("/api/webhooks?limit=101").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/webhooks")
    expect(res.status).toBe(401)
  })
})

// ─── Get event by ID ──────────────────────────────────────────────────────────

describe("GET /api/webhooks/:id", () => {
  beforeEach(reset)

  it("returns own event → 200", async () => {
    mocks.webhook.getById.mockResolvedValue(fakeWebhookEvent)
    const res = await request(app)
      .get(`/api/webhooks/${fakeWebhookEvent.id}`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe("evt-001")
  })

  it("returns 404 for another user's event (service returns null)", async () => {
    mocks.webhook.getById.mockResolvedValue(null)
    const res = await request(app)
      .get("/api/webhooks/other-user-evt")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("returns 404 for non-existent event", async () => {
    mocks.webhook.getById.mockResolvedValue(null)
    const res = await request(app)
      .get("/api/webhooks/nonexistent")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/webhooks/evt-001")
    expect(res.status).toBe(401)
  })
})

// ─── List deliveries for event ────────────────────────────────────────────────

describe("GET /api/webhooks/:id/deliveries", () => {
  beforeEach(reset)

  it("returns deliveries with default pagination → 200", async () => {
    mocks.webhook.listDeliveries.mockResolvedValue({
      data: [fakeDelivery],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const res = await request(app)
      .get(`/api/webhooks/${fakeWebhookEvent.id}/deliveries`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects invalid ?status → 400", async () => {
    const res = await request(app)
      .get("/api/webhooks/evt-001/deliveries?status=BOGUS")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app)
      .get("/api/webhooks/evt-001/deliveries?page=0")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app)
      .get("/api/webhooks/evt-001/deliveries?limit=101")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/webhooks/evt-001/deliveries")
    expect(res.status).toBe(401)
  })
})

// ─── List logs for event ──────────────────────────────────────────────────────

describe("GET /api/webhooks/:id/logs", () => {
  beforeEach(reset)

  it("returns logs with default pagination → 200", async () => {
    mocks.webhook.listLogs.mockResolvedValue({
      data: [{ id: "log-001", type: "RECEIVED", createdAt: new Date() }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    })
    const res = await request(app)
      .get("/api/webhooks/evt-001/logs")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app)
      .get("/api/webhooks/evt-001/logs?page=0")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app)
      .get("/api/webhooks/evt-001/logs?limit=101")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/webhooks/evt-001/logs")
    expect(res.status).toBe(401)
  })
})

// ─── Retry ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/:id/retry", () => {
  beforeEach(reset)

  it("creates retry delivery → 201", async () => {
    mocks.webhook.retry.mockResolvedValue(fakeDelivery)
    const res = await request(app)
      .post("/api/webhooks/evt-001/retry")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(201)
  })

  it("returns 404 when event not found", async () => {
    mocks.webhook.retry.mockResolvedValue(null)
    const res = await request(app)
      .post("/api/webhooks/nonexistent/retry")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post("/api/webhooks/evt-001/retry")
    expect(res.status).toBe(401)
  })
})

// ─── Batch replay ─────────────────────────────────────────────────────────────

describe("POST /api/webhooks/batch/replay", () => {
  beforeEach(reset)

  it("replays valid array of event IDs → 200", async () => {
    mocks.webhook.batchReplay.mockResolvedValue({ successCount: 2, failureCount: 0 })
    const res = await request(app)
      .post("/api/webhooks/batch/replay")
      .set("Cookie", await authCookie())
      .send({ eventIds: ["evt-001", "evt-002"] })
    expect(res.status).toBe(200)
    expect(res.body.data.successCount).toBe(2)
  })

  it("rejects empty eventIds array → 400", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/replay")
      .set("Cookie", await authCookie())
      .send({ eventIds: [] })
    expect(res.status).toBe(400)
  })

  it("rejects non-array eventIds → 400", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/replay")
      .set("Cookie", await authCookie())
      .send({ eventIds: "evt-001" })
    expect(res.status).toBe(400)
  })

  it("rejects array with more than 100 items → 400", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/replay")
      .set("Cookie", await authCookie())
      .send({ eventIds: Array.from({ length: 101 }, (_, i) => `evt-${i}`) })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/replay")
      .send({ eventIds: ["evt-001"] })
    expect(res.status).toBe(401)
  })
})

// ─── Batch delete ─────────────────────────────────────────────────────────────

describe("POST /api/webhooks/batch/delete", () => {
  beforeEach(reset)

  it("soft-deletes valid array of event IDs → 200", async () => {
    mocks.webhook.batchDelete.mockResolvedValue({ deletedCount: 2 })
    const res = await request(app)
      .post("/api/webhooks/batch/delete")
      .set("Cookie", await authCookie())
      .send({ eventIds: ["evt-001", "evt-002"] })
    expect(res.status).toBe(200)
    expect(res.body.data.deletedCount).toBe(2)
  })

  it("rejects empty eventIds array → 400", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/delete")
      .set("Cookie", await authCookie())
      .send({ eventIds: [] })
    expect(res.status).toBe(400)
  })

  it("rejects array with more than 100 items → 400", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/delete")
      .set("Cookie", await authCookie())
      .send({ eventIds: Array.from({ length: 101 }, (_, i) => `evt-${i}`) })
    expect(res.status).toBe(400)
  })

  it("rejects non-array eventIds → 400", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/delete")
      .set("Cookie", await authCookie())
      .send({ eventIds: null })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app)
      .post("/api/webhooks/batch/delete")
      .send({ eventIds: ["evt-001"] })
    expect(res.status).toBe(401)
  })
})
