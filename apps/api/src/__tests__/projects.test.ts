import { describe, it, expect, beforeEach } from "bun:test"
import request from "supertest"
import { mocks } from "./helpers/preload"
import { createApp } from "./helpers/app"
import { authCookie } from "./helpers/auth"
import { fakeProject, fakePaginatedProjects } from "./helpers/fixtures"

const app = createApp()

const reset = () => Object.values(mocks.project).forEach((m) => m.mockReset())

// ─── List projects ────────────────────────────────────────────────────────────

describe("GET /api/projects", () => {
  beforeEach(reset)

  it("returns paginated list for authenticated user → 200", async () => {
    mocks.project.listByUser.mockResolvedValue(fakePaginatedProjects)
    const res = await request(app).get("/api/projects").set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.data)).toBe(true)
  })

  it("supports ?search= query parameter → 200", async () => {
    mocks.project.listByUser.mockResolvedValue(fakePaginatedProjects)
    const res = await request(app)
      .get("/api/projects?search=test")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("rejects page=0 → 400", async () => {
    const res = await request(app).get("/api/projects?page=0").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects non-integer page → 400", async () => {
    const res = await request(app)
      .get("/api/projects?page=abc")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=0 → 400", async () => {
    const res = await request(app).get("/api/projects?limit=0").set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects limit=101 (over max) → 400", async () => {
    const res = await request(app)
      .get("/api/projects?limit=101")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/projects")
    expect(res.status).toBe(401)
  })

  it("service receives the requesting user's ID (ownership isolation)", async () => {
    mocks.project.listByUser.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } })
    const OTHER = "user-other-999"
    await request(app).get("/api/projects").set("Cookie", await authCookie(OTHER, "other@test.com"))
    expect(mocks.project.listByUser.mock.calls[0][0]).toBe(OTHER)
  })
})

// ─── Create project ───────────────────────────────────────────────────────────

describe("POST /api/projects", () => {
  beforeEach(reset)

  it("creates project with valid data → 201", async () => {
    mocks.project.create.mockResolvedValue(fakeProject)
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", await authCookie())
      .send({ name: "My New Project" })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it("rejects missing name → 400", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", await authCookie())
      .send({})
    expect(res.status).toBe(400)
  })

  it("rejects whitespace-only name → 400", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", await authCookie())
      .send({ name: "   " })
    expect(res.status).toBe(400)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).post("/api/projects").send({ name: "Test" })
    expect(res.status).toBe(401)
  })
})

// ─── Get project by ID ────────────────────────────────────────────────────────

describe("GET /api/projects/:id", () => {
  beforeEach(reset)

  it("returns own project → 200", async () => {
    mocks.project.getById.mockResolvedValue(fakeProject)
    const res = await request(app)
      .get(`/api/projects/${fakeProject.id}`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe("proj-001")
  })

  it("returns 404 when another user's project ID is given (service returns null)", async () => {
    mocks.project.getById.mockResolvedValue(null)
    const res = await request(app)
      .get("/api/projects/other-user-proj")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("returns 404 for non-existent ID", async () => {
    mocks.project.getById.mockResolvedValue(null)
    const res = await request(app)
      .get("/api/projects/nonexistent-id")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).get("/api/projects/proj-001")
    expect(res.status).toBe(401)
  })
})

// ─── Update project ───────────────────────────────────────────────────────────

describe("PUT /api/projects/:id", () => {
  beforeEach(reset)

  it("updates own project → 200", async () => {
    mocks.project.update.mockResolvedValue(fakeProject)
    const res = await request(app)
      .put(`/api/projects/${fakeProject.id}`)
      .set("Cookie", await authCookie())
      .send({ name: "Updated Name" })
    expect(res.status).toBe(200)
  })

  it("returns 404 when project belongs to another user (service returns null)", async () => {
    mocks.project.update.mockResolvedValue(null)
    const res = await request(app)
      .put("/api/projects/other-proj")
      .set("Cookie", await authCookie())
      .send({ name: "Hijack Attempt" })
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).put("/api/projects/proj-001").send({ name: "X" })
    expect(res.status).toBe(401)
  })
})

// ─── Delete project ───────────────────────────────────────────────────────────

describe("DELETE /api/projects/:id", () => {
  beforeEach(reset)

  it("soft-deletes own project → 200", async () => {
    mocks.project.softDelete.mockResolvedValue(fakeProject)
    const res = await request(app)
      .delete(`/api/projects/${fakeProject.id}`)
      .set("Cookie", await authCookie())
    expect(res.status).toBe(200)
  })

  it("returns 404 when project not found (service returns null)", async () => {
    mocks.project.softDelete.mockResolvedValue(null)
    const res = await request(app)
      .delete("/api/projects/nonexistent")
      .set("Cookie", await authCookie())
    expect(res.status).toBe(404)
  })

  it("rejects unauthenticated request → 401", async () => {
    const res = await request(app).delete("/api/projects/proj-001")
    expect(res.status).toBe(401)
  })
})
