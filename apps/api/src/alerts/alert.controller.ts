import type { Request, Response } from "express"
import { badRequest, created, error, json, noContent, notFound } from "../lib/response"
import { sseManager } from "../lib/sse-manager"
import type { AuthenticatedRequest } from "../middleware/require-auth"
import type { AlertService } from "./alert.service"
import { createAlertSchema, updateAlertSchema } from "../types/alert"

export class AlertController {
  constructor(private readonly service: AlertService) {}

  // GET /api/alerts
  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const page = Number(req.query.page ?? 1)
      const limit = Number(req.query.limit ?? 10)
      const search = (req.query.search as string | undefined)?.trim() || undefined

      if (!Number.isInteger(page) || page < 1) return badRequest(res, "'page' must be a positive integer")
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) return badRequest(res, "'limit' must be 1–100")

      const result = await this.service.list(userId, { page, limit, search })
      json(res, result)
    } catch (err) {
      console.error("[AlertController.list]", err)
      error(res, "Failed to fetch alerts")
    }
  }

  // POST /api/alerts
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const parsed = createAlertSchema.safeParse(req.body)
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(", ")
        return badRequest(res, msg)
      }

      const { alert, error: configError } = await this.service.create(userId, parsed.data)
      if (configError) return badRequest(res, configError)
      created(res, alert, "Alert created")
    } catch (err) {
      console.error("[AlertController.create]", err)
      error(res, "Failed to create alert")
    }
  }

  // GET /api/alerts/:id
  getById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const alert = await this.service.getById(req.params.id, userId)
      if (!alert) return notFound(res, "Alert not found")
      json(res, alert)
    } catch (err) {
      console.error("[AlertController.getById]", err)
      error(res, "Failed to fetch alert")
    }
  }

  // PATCH /api/alerts/:id
  update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const parsed = updateAlertSchema.safeParse(req.body)
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(", ")
        return badRequest(res, msg)
      }

      const { alert, error: configError } = await this.service.update(req.params.id, userId, parsed.data)
      if (configError) return badRequest(res, configError)
      if (!alert) return notFound(res, "Alert not found")
      json(res, alert, 200, "Alert updated")
    } catch (err) {
      console.error("[AlertController.update]", err)
      error(res, "Failed to update alert")
    }
  }

  // DELETE /api/alerts/:id
  delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const deleted = await this.service.delete(req.params.id, userId)
      if (!deleted) return notFound(res, "Alert not found")
      noContent(res, "Alert deleted")
    } catch (err) {
      console.error("[AlertController.delete]", err)
      error(res, "Failed to delete alert")
    }
  }

  // GET /api/alerts/:id/triggers
  listTriggers = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const page = Number(req.query.page ?? 1)
      const limit = Number(req.query.limit ?? 20)

      if (!Number.isInteger(page) || page < 1) return badRequest(res, "'page' must be a positive integer")
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) return badRequest(res, "'limit' must be 1–100")

      const result = await this.service.listTriggers(req.params.id, userId, page, limit)
      if (!result) return notFound(res, "Alert not found")
      json(res, result)
    } catch (err) {
      console.error("[AlertController.listTriggers]", err)
      error(res, "Failed to fetch trigger history")
    }
  }

  // POST /api/alerts/:id/test-trigger
  createTestTrigger = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user

      if (process.env["NODE_ENV"] === "production") {
        return badRequest(res, "Test trigger endpoint is disabled in production")
      }

      const message =
        typeof req.body?.message === "string" ? req.body.message : undefined
      const metadata =
        req.body?.metadata && typeof req.body.metadata === "object"
          ? (req.body.metadata as Record<string, unknown>)
          : undefined

      const result = await this.service.createTestTrigger(req.params.id, userId, {
        message,
        metadata,
      })

      if (!result) return notFound(res, "Alert not found")
      if ("error" in result) return badRequest(res, result.error)

      sseManager.send(userId, "alert_triggered", result.event)
      created(res, result.trigger, "Test trigger created")
    } catch (err) {
      console.error("[AlertController.createTestTrigger]", err)
      error(res, "Failed to create test trigger")
    }
  }

  // GET /api/alerts/history  — all triggers across all user alerts
  listAllTriggers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const page = Number(req.query.page ?? 1)
      const limit = Number(req.query.limit ?? 20)

      if (!Number.isInteger(page) || page < 1) return badRequest(res, "'page' must be a positive integer")
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) return badRequest(res, "'limit' must be 1–100")

      const result = await this.service.listAllTriggers(userId, page, limit)
      json(res, result)
    } catch (err) {
      console.error("[AlertController.listAllTriggers]", err)
      error(res, "Failed to fetch trigger history")
    }
  }

  // GET /api/alerts/stream  — SSE connection
  stream = async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no") // disable Nginx buffering
    res.flushHeaders()

    sseManager.add(userId, res)

    // Send initial connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`)

    // Keepalive ping every 30s to prevent proxy/browser timeout
    const keepalive = setInterval(() => {
      res.write(": ping\n\n")
    }, 30_000)

    req.on("close", () => {
      clearInterval(keepalive)
      sseManager.remove(userId, res)
    })
  }
}
