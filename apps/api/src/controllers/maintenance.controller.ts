import type { Request, Response } from "express"
import { json, error, badRequest } from "../lib/response"
import type { EventExpirationService } from "../services/event-expiration.service"

/**
 * Maintenance controller — handles background tasks like event expiration.
 *
 * Protected by a secret token to prevent unauthorized access.
 * Should be called by a cron job or internal scheduler.
 */
export class MaintenanceController {
  constructor(private readonly expirationService: EventExpirationService) {}

  /**
   * POST /api/maintenance/expire-events
   * Expires old webhook events based on plan retention policies.
   *
   * Requires: X-Maintenance-Secret header matching MAINTENANCE_SECRET env var
   */
  expireEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const secret = req.headers["x-maintenance-secret"] as string | undefined
      const expectedSecret = process.env.MAINTENANCE_SECRET || ""

      if (!expectedSecret) {
        res.status(503)
        return error(res, "Maintenance endpoint not configured")
      }

      if (secret !== expectedSecret) {
        return badRequest(res, "Invalid maintenance secret")
      }

      const result = await this.expirationService.expireOldEvents()
      json(res, result, 200, `Expired ${result.deletedCount} old event(s) across ${result.processedUsers} user(s)`)
    } catch (err) {
      console.error("[MaintenanceController.expireEvents]", err)
      error(res, "Failed to expire old events")
    }
  }

  /**
   * POST /api/maintenance/cleanup-logs
   * Prunes logs for long-deleted events (space management).
   *
   * Requires: X-Maintenance-Secret header matching MAINTENANCE_SECRET env var
   */
  cleanupLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const secret = req.headers["x-maintenance-secret"] as string | undefined
      const expectedSecret = process.env.MAINTENANCE_SECRET || ""

      if (!expectedSecret) {
        res.status(503)
        return error(res, "Maintenance endpoint not configured")
      }

      if (secret !== expectedSecret) {
        return badRequest(res, "Invalid maintenance secret")
      }

      const result = await this.expirationService.cleanupDeletedEventLogs()
      json(res, result, 200, `Pruned ${result.prunedCount} log entries`)
    } catch (err) {
      console.error("[MaintenanceController.cleanupLogs]", err)
      error(res, "Failed to cleanup logs")
    }
  }
}
