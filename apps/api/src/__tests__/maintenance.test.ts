import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"

const app = createApp()

const VALID_SECRET = "test-maintenance-secret" // matches process.env.MAINTENANCE_SECRET set in preload

const reset = () => Object.values(mocks.maintenance).forEach((m) => m.mockReset())

// ─── Expire events ────────────────────────────────────────────────────────────

describe("POST /api/maintenance/expire-events", () => {
  beforeEach(reset)

  it("expires old events with correct secret → 200", async () => {
    mocks.maintenance.expireOldEvents.mockResolvedValue({ deletedCount: 42, processedUsers: 10 })
    const res = await request(app)
      .post("/api/maintenance/expire-events")
      .set("X-Maintenance-Secret", VALID_SECRET)
    expect(res.status).toBe(200)
    expect(res.body.data.deletedCount).toBe(42)
    expect(res.body.data.processedUsers).toBe(10)
  })

  it("rejects wrong secret → 400", async () => {
    const res = await request(app)
      .post("/api/maintenance/expire-events")
      .set("X-Maintenance-Secret", "wrong-secret")
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it("rejects missing secret header → 400", async () => {
    const res = await request(app).post("/api/maintenance/expire-events")
    expect(res.status).toBe(400)
  })

  it("returns 503 when MAINTENANCE_SECRET env var is not configured", async () => {
    const original = process.env["MAINTENANCE_SECRET"]
    delete process.env["MAINTENANCE_SECRET"]
    const res = await request(app)
      .post("/api/maintenance/expire-events")
      .set("X-Maintenance-Secret", VALID_SECRET)
    process.env["MAINTENANCE_SECRET"] = original
    expect(res.status).toBe(503)
  })

  it("does not require auth cookie — protected by secret header only", async () => {
    mocks.maintenance.expireOldEvents.mockResolvedValue({ deletedCount: 0, processedUsers: 0 })
    const res = await request(app)
      .post("/api/maintenance/expire-events")
      .set("X-Maintenance-Secret", VALID_SECRET)
    expect(res.status).toBe(200)
  })
})

// ─── Cleanup logs ─────────────────────────────────────────────────────────────

describe("POST /api/maintenance/cleanup-logs", () => {
  beforeEach(reset)

  it("prunes deleted event logs with correct secret → 200", async () => {
    mocks.maintenance.cleanupDeletedEventLogs.mockResolvedValue({ prunedCount: 17 })
    const res = await request(app)
      .post("/api/maintenance/cleanup-logs")
      .set("X-Maintenance-Secret", VALID_SECRET)
    expect(res.status).toBe(200)
    expect(res.body.data.prunedCount).toBe(17)
  })

  it("rejects wrong secret → 400", async () => {
    const res = await request(app)
      .post("/api/maintenance/cleanup-logs")
      .set("X-Maintenance-Secret", "bad-secret")
    expect(res.status).toBe(400)
  })

  it("rejects missing secret header → 400", async () => {
    const res = await request(app).post("/api/maintenance/cleanup-logs")
    expect(res.status).toBe(400)
  })

  it("returns 503 when MAINTENANCE_SECRET env var is not configured", async () => {
    const original = process.env["MAINTENANCE_SECRET"]
    delete process.env["MAINTENANCE_SECRET"]
    const res = await request(app)
      .post("/api/maintenance/cleanup-logs")
      .set("X-Maintenance-Secret", VALID_SECRET)
    process.env["MAINTENANCE_SECRET"] = original
    expect(res.status).toBe(503)
  })

  it("does not require auth cookie — protected by secret header only", async () => {
    mocks.maintenance.cleanupDeletedEventLogs.mockResolvedValue({ prunedCount: 0 })
    const res = await request(app)
      .post("/api/maintenance/cleanup-logs")
      .set("X-Maintenance-Secret", VALID_SECRET)
    expect(res.status).toBe(200)
  })
})
