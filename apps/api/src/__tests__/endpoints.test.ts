import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"
import { authCookie } from "./helpers/auth"
import { fakeEndpoint, fakePaginatedEndpoints, fakeDelivery } from "./helpers/fixtures"

const app = createApp()

const PROJECT_ID = "proj-001"
const BASE = `/api/projects/${PROJECT_ID}/endpoints`

const resetMocks = () => {
  Object.values(mocks.endpoint).forEach((m) => m.mockReset())
  Object.values(mocks.usage).forEach((m) => m.mockReset())
  mocks.endpoint.verifyOwnership.mockResolvedValue(true)
  mocks.usage.getPlanForUser.mockResolvedValue(null)      // free tier (limit 3)
  mocks.usage.getActiveEndpointCount.mockResolvedValue(0) // under limit
}

// ─── List endpoints ───────────────────────────────────────────────────────────

describe(`GET ${BASE}`, () => {
  beforeEach(resetMocks)

  it("returns endpoints for owned project → 200", async () => {
    mocks.endpoint.listByProject.mockResolvedValue(fakePaginatedEndpoints)
    const res = await request(app).get(BASE).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.data)).toBe(true)
  })

  it("returns 404 when project is not owned", async () => {
    mocks.endpoint.verifyOwnership.mockResolvedValue(false)
    const res = await request(app).get(BASE).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects invalid ?source → 400", async () => {
    const res = await request(app).get(`${BASE}?source=INVALID`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects invalid ?status → 400", async () => {
    const res = await request(app).get(`${BASE}?status=unknown`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app).get(`${BASE}?page=0`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app).get(`${BASE}?limit=101`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })
})

// ─── Create endpoint ──────────────────────────────────────────────────────────

describe(`POST ${BASE}`, () => {
  beforeEach(resetMocks)

  const valid = {
    name: "My Endpoint",
    source: "GITHUB",
    destinationUrl: "https://example.com/wh",
  }

  it("creates endpoint with valid data → 201", async () => {
    mocks.endpoint.create.mockResolvedValue(fakeEndpoint)
    const res = await request(app).post(BASE).set("Cookie", await authCookie()).send(valid)
    expect(res.status).toBe(201)
  })

  it("rejects missing name → 400", async () => {
    const { name: _n, ...body } = valid
    const res = await request(app).post(BASE).set("Cookie", await authCookie()).send(body)
    expect(res.status).toBe(400)
  })

  it("rejects whitespace-only name → 400", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", await authCookie())
      .send({ ...valid, name: "   " })
    expect(res.status).toBe(400)
  })

  it("rejects missing source → 400", async () => {
    const { source: _s, ...body } = valid
    const res = await request(app).post(BASE).set("Cookie", await authCookie()).send(body)
    expect(res.status).toBe(400)
  })

  it("rejects invalid source enum → 400", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", await authCookie())
      .send({ ...valid, source: "UNKNOWN_PROVIDER" })
    expect(res.status).toBe(400)
  })

  it("rejects missing destinationUrl → 400", async () => {
    const { destinationUrl: _d, ...body } = valid
    const res = await request(app).post(BASE).set("Cookie", await authCookie()).send(body)
    expect(res.status).toBe(400)
  })

  it("rejects malformed destinationUrl → 400", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", await authCookie())
      .send({ ...valid, destinationUrl: "not-a-url" })
    expect(res.status).toBe(400)
  })

  it("rejects invalid verificationMode enum → 400", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", await authCookie())
      .send({ ...valid, verificationMode: "BOGUS" })
    expect(res.status).toBe(400)
  })

  it("rejects STRICT mode without signingSecret → 400", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", await authCookie())
      .send({ ...valid, verificationMode: "STRICT" })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/signingSecret/)
  })

  it("accepts STRICT mode with signingSecret → 201", async () => {
    mocks.endpoint.create.mockResolvedValue(fakeEndpoint)
    const res = await request(app)
      .post(BASE)
      .set("Cookie", await authCookie())
      .send({ ...valid, verificationMode: "STRICT", signingSecret: "whsec_test123" })
    expect(res.status).toBe(201)
  })

  it("rejects negative toleranceSec → 400", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Cookie", await authCookie())
      .send({ ...valid, toleranceSec: -1 })
    expect(res.status).toBe(400)
  })

  it("rejects when free-tier endpoint limit is reached → 400", async () => {
    mocks.usage.getActiveEndpointCount.mockResolvedValue(3)
    const res = await request(app).post(BASE).set("Cookie", await authCookie()).send(valid)
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/limit/)
  })

  it("returns 404 when project not owned", async () => {
    mocks.endpoint.verifyOwnership.mockResolvedValue(false)
    const res = await request(app).post(BASE).set("Cookie", await authCookie()).send(valid)
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post(BASE).send(valid)
    expect(res.status).toBe(401)
  })
})

// ─── Get endpoint by ID ───────────────────────────────────────────────────────

describe(`GET ${BASE}/:id`, () => {
  beforeEach(resetMocks)

  it("returns own endpoint → 200", async () => {
    mocks.endpoint.getById.mockResolvedValue(fakeEndpoint)
    const res = await request(app).get(`${BASE}/ep-001`).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.getById.mockResolvedValue(null)
    const res = await request(app).get(`${BASE}/nonexistent`).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("returns 404 when project not owned", async () => {
    mocks.endpoint.verifyOwnership.mockResolvedValue(false)
    const res = await request(app).get(`${BASE}/ep-001`).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get(`${BASE}/ep-001`)
    expect(res.status).toBe(401)
  })
})

// ─── Update endpoint ──────────────────────────────────────────────────────────

describe(`PUT ${BASE}/:id`, () => {
  beforeEach(resetMocks)

  it("updates endpoint → 200", async () => {
    mocks.endpoint.update.mockResolvedValue(fakeEndpoint)
    const res = await request(app)
      .put(`${BASE}/ep-001`)
      .set("Cookie", await authCookie())
      .send({ name: "Renamed" })
    expect(res.status).toBe(200)
  })

  it("rejects empty destinationUrl → 400", async () => {
    const res = await request(app)
      .put(`${BASE}/ep-001`)
      .set("Cookie", await authCookie())
      .send({ destinationUrl: "" })
    expect(res.status).toBe(400)
  })

  it("rejects malformed destinationUrl → 400", async () => {
    const res = await request(app)
      .put(`${BASE}/ep-001`)
      .set("Cookie", await authCookie())
      .send({ destinationUrl: "not-a-url" })
    expect(res.status).toBe(400)
  })

  it("rejects invalid verificationMode → 400", async () => {
    const res = await request(app)
      .put(`${BASE}/ep-001`)
      .set("Cookie", await authCookie())
      .send({ verificationMode: "BOGUS" })
    expect(res.status).toBe(400)
  })

  it("rejects invalid status value → 400", async () => {
    const res = await request(app)
      .put(`${BASE}/ep-001`)
      .set("Cookie", await authCookie())
      .send({ status: "disabled" })
    expect(res.status).toBe(400)
  })

  it("rejects negative toleranceSec → 400", async () => {
    const res = await request(app)
      .put(`${BASE}/ep-001`)
      .set("Cookie", await authCookie())
      .send({ toleranceSec: -5 })
    expect(res.status).toBe(400)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.update.mockResolvedValue(null)
    const res = await request(app)
      .put(`${BASE}/nonexistent`)
      .set("Cookie", await authCookie())
      .send({ name: "X" })
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).put(`${BASE}/ep-001`).send({ name: "X" })
    expect(res.status).toBe(401)
  })
})

// ─── Update endpoint status ───────────────────────────────────────────────────

describe(`PATCH ${BASE}/:id/status`, () => {
  beforeEach(resetMocks)

  it("sets status to active → 200", async () => {
    mocks.endpoint.toggleStatus.mockResolvedValue(fakeEndpoint)
    const res = await request(app)
      .patch(`${BASE}/ep-001/status`)
      .set("Cookie", await authCookie())
      .send({ status: "active" })
    expect(res.status).toBe(200)
  })

  it("sets status to paused → 200", async () => {
    mocks.endpoint.toggleStatus.mockResolvedValue({ ...fakeEndpoint, status: "paused" })
    const res = await request(app)
      .patch(`${BASE}/ep-001/status`)
      .set("Cookie", await authCookie())
      .send({ status: "paused" })
    expect(res.status).toBe(200)
  })

  it("rejects missing status → 400", async () => {
    const res = await request(app)
      .patch(`${BASE}/ep-001/status`)
      .set("Cookie", await authCookie())
      .send({})
    expect(res.status).toBe(400)
  })

  it("rejects invalid status value → 400", async () => {
    const res = await request(app)
      .patch(`${BASE}/ep-001/status`)
      .set("Cookie", await authCookie())
      .send({ status: "deleted" })
    expect(res.status).toBe(400)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.toggleStatus.mockResolvedValue(null)
    const res = await request(app)
      .patch(`${BASE}/ep-001/status`)
      .set("Cookie", await authCookie())
      .send({ status: "active" })
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).patch(`${BASE}/ep-001/status`).send({ status: "active" })
    expect(res.status).toBe(401)
  })
})

// ─── Delete endpoint ──────────────────────────────────────────────────────────

describe(`DELETE ${BASE}/:id`, () => {
  beforeEach(resetMocks)

  it("soft-deletes endpoint → 200", async () => {
    mocks.endpoint.softDelete.mockResolvedValue(fakeEndpoint)
    const res = await request(app).delete(`${BASE}/ep-001`).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.softDelete.mockResolvedValue(null)
    const res = await request(app).delete(`${BASE}/nonexistent`).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).delete(`${BASE}/ep-001`)
    expect(res.status).toBe(401)
  })
})

// ─── Stats ────────────────────────────────────────────────────────────────────

describe(`GET ${BASE}/:id/stats`, () => {
  beforeEach(resetMocks)

  it("returns stats → 200", async () => {
    mocks.endpoint.getStats.mockResolvedValue({ total: 100, success: 90, failed: 10 })
    const res = await request(app).get(`${BASE}/ep-001/stats`).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.getStats.mockResolvedValue(null)
    const res = await request(app).get(`${BASE}/nonexistent/stats`).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get(`${BASE}/ep-001/stats`)
    expect(res.status).toBe(401)
  })
})

// ─── Volume ───────────────────────────────────────────────────────────────────

describe(`GET ${BASE}/:id/volume`, () => {
  beforeEach(resetMocks)

  it("returns volume for default 24h → 200", async () => {
    mocks.endpoint.getVolume.mockResolvedValue([{ hour: "2026-01-01T00:00:00Z", count: 5 }])
    const res = await request(app).get(`${BASE}/ep-001/volume`).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("accepts ?hours=48 → 200", async () => {
    mocks.endpoint.getVolume.mockResolvedValue([])
    const res = await request(app).get(`${BASE}/ep-001/volume?hours=48`).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects hours=0 → 400", async () => {
    const res = await request(app).get(`${BASE}/ep-001/volume?hours=0`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects hours=721 (over max) → 400", async () => {
    const res = await request(app).get(`${BASE}/ep-001/volume?hours=721`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.getVolume.mockResolvedValue(null)
    const res = await request(app).get(`${BASE}/nonexistent/volume`).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get(`${BASE}/ep-001/volume`)
    expect(res.status).toBe(401)
  })
})

// ─── Delivery stats ───────────────────────────────────────────────────────────

describe(`GET ${BASE}/:id/delivery-stats`, () => {
  beforeEach(resetMocks)

  it("returns delivery stats → 200", async () => {
    mocks.endpoint.getDeliveryStats.mockResolvedValue({ successRate: 0.95, avgLatencyMs: 120 })
    const res = await request(app).get(`${BASE}/ep-001/delivery-stats`).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.getDeliveryStats.mockResolvedValue(null)
    const res = await request(app).get(`${BASE}/nonexistent/delivery-stats`).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get(`${BASE}/ep-001/delivery-stats`)
    expect(res.status).toBe(401)
  })
})

// ─── Deliveries ───────────────────────────────────────────────────────────────

describe(`GET ${BASE}/:id/deliveries`, () => {
  beforeEach(resetMocks)

  it("returns deliveries with default pagination → 200", async () => {
    mocks.endpoint.getDeliveries.mockResolvedValue({
      data: [fakeDelivery],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const res = await request(app).get(`${BASE}/ep-001/deliveries`).set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects invalid ?status → 400", async () => {
    const res = await request(app)
      .get(`${BASE}/ep-001/deliveries?status=INVALID`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects invalid ?errorCode → 400", async () => {
    const res = await request(app)
      .get(`${BASE}/ep-001/deliveries?errorCode=MADE_UP`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app).get(`${BASE}/ep-001/deliveries?page=0`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 → 400", async () => {
    const res = await request(app).get(`${BASE}/ep-001/deliveries?limit=101`).set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("returns 404 when endpoint not found", async () => {
    mocks.endpoint.getDeliveries.mockResolvedValue(null)
    const res = await request(app).get(`${BASE}/nonexistent/deliveries`).set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get(`${BASE}/ep-001/deliveries`)
    expect(res.status).toBe(401)
  })
})
