import type { Request, Response } from "express"
import { badRequest, created, error, json, notFound } from "../lib/response"
import type { AuthenticatedRequest } from "../middleware/require-auth"
import type { WebhookService } from "../services/webhook.service"
import { EventStatus, SourceProvider, DeliveryStatus } from "@workspace/db"

const VALID_EVENT_STATUSES = new Set(Object.values(EventStatus))
const VALID_SOURCE_PROVIDERS = new Set(Object.values(SourceProvider))
const VALID_DELIVERY_STATUSES = new Set(Object.values(DeliveryStatus))

export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const pageRaw = req.query.page as string | undefined
      const limitRaw = req.query.limit as string | undefined
      const searchRaw = req.query.search as string | undefined
      const eventTypeRaw = req.query.eventType as string | undefined
      const projectId = req.query.projectId as string | undefined
      const endpointId = req.query.endpointId as string | undefined
      const statusRaw = req.query.status as string | undefined
      const sourceRaw = req.query.source as string | undefined

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 20
      if (!Number.isInteger(page) || page < 1) {
        return badRequest(res, "'page' must be a positive integer")
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return badRequest(res, "'limit' must be an integer between 1 and 100")
      }

      if (statusRaw && !VALID_EVENT_STATUSES.has(statusRaw as EventStatus)) {
        return badRequest(res, `'status' must be one of: ${[...VALID_EVENT_STATUSES].join(", ")}`)
      }
      if (sourceRaw && !VALID_SOURCE_PROVIDERS.has(sourceRaw as SourceProvider)) {
        return badRequest(res, `'source' must be one of: ${[...VALID_SOURCE_PROVIDERS].join(", ")}`)
      }

      const result = await this.service.listByUser(userId, {
        page,
        limit,
        search: searchRaw?.trim() || undefined,
        eventType: eventTypeRaw?.trim() || undefined,
        projectId,
        endpointId,
        status: statusRaw as EventStatus | undefined,
        source: sourceRaw as SourceProvider | undefined,
      })
      json(res, result)
    } catch (err) {
      console.error("[WebhookController.list]", err)
      error(res, "Failed to fetch webhook events")
    }
  }

  getById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const event = await this.service.getById(req.params.id, userId)
      if (!event) return notFound(res, `Webhook event '${req.params.id}' not found`)
      json(res, event)
    } catch (err) {
      console.error("[WebhookController.getById]", err)
      error(res, "Failed to fetch webhook event")
    }
  }

  listDeliveries = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const pageRaw = req.query.page as string | undefined
      const limitRaw = req.query.limit as string | undefined
      const statusRaw = req.query.status as string | undefined

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 20
      if (!Number.isInteger(page) || page < 1) {
        return badRequest(res, "'page' must be a positive integer")
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return badRequest(res, "'limit' must be an integer between 1 and 100")
      }
      if (statusRaw && !VALID_DELIVERY_STATUSES.has(statusRaw as DeliveryStatus)) {
        return badRequest(res, `'status' must be one of: ${[...VALID_DELIVERY_STATUSES].join(", ")}`)
      }

      const result = await this.service.listDeliveries(req.params.id, userId, {
        page,
        limit,
        status: statusRaw as DeliveryStatus | undefined,
      })
      json(res, result)
    } catch (err) {
      console.error("[WebhookController.listDeliveries]", err)
      error(res, "Failed to fetch deliveries")
    }
  }

  listLogs = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const pageRaw = req.query.page as string | undefined
      const limitRaw = req.query.limit as string | undefined

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 50
      if (!Number.isInteger(page) || page < 1) {
        return badRequest(res, "'page' must be a positive integer")
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return badRequest(res, "'limit' must be an integer between 1 and 100")
      }

      const result = await this.service.listLogs(req.params.id, userId, { page, limit })
      json(res, result)
    } catch (err) {
      console.error("[WebhookController.listLogs]", err)
      error(res, "Failed to fetch event logs")
    }
  }

  retry = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { userId } = (req as unknown as AuthenticatedRequest).user
      const delivery = await this.service.retry(req.params.id, userId)
      if (!delivery) return notFound(res, `Webhook event '${req.params.id}' not found`)
      created(res, delivery, "Retry delivery created")
    } catch (err) {
      console.error("[WebhookController.retry]", err)
      error(res, "Failed to retry webhook event")
    }
  }

  batchReplay = async (
    req: Request<never, never, { eventIds: string[] }>,
    res: Response
  ): Promise<void> => {
    try {
      const { userId } = ((req as unknown) as AuthenticatedRequest).user
      const { eventIds } = req.body

      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        return badRequest(res, "'eventIds' must be a non-empty array of strings")
      }
      if (eventIds.length > 100) {
        return badRequest(res, "'eventIds' cannot exceed 100 items per request")
      }

      const result = await this.service.batchReplay(eventIds, userId)
      json(res, result, 200, "Batch replay initiated for " + result.successCount + " event(s)")
    } catch (err) {
      console.error("[WebhookController.batchReplay]", err)
      error(res, "Failed to batch replay webhook events")
    }
  }

  batchDelete = async (
    req: Request<never, never, { eventIds: string[] }>,
    res: Response
  ): Promise<void> => {
    try {
      const { userId } = ((req as unknown) as AuthenticatedRequest).user
      const { eventIds } = req.body

      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        return badRequest(res, "'eventIds' must be a non-empty array of strings")
      }
      if (eventIds.length > 100) {
        return badRequest(res, "'eventIds' cannot exceed 100 items per request")
      }

      const result = await this.service.batchDelete(eventIds, userId)
      json(res, result, 200, "Soft-deleted " + result.deletedCount + " event(s)")
    } catch (err) {
      console.error("[WebhookController.batchDelete]", err)
      error(res, "Failed to delete webhook events")
    }
  }
}
