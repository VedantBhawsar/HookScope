import { Router } from "express"
import { MaintenanceController } from "../controllers/maintenance.controller"
import { EventExpirationService } from "../services/event-expiration.service"

const expirationService = new EventExpirationService()
const controller = new MaintenanceController(expirationService)

export const maintenanceRouter = Router()

// No auth required — protected by MAINTENANCE_SECRET header
maintenanceRouter.post("/expire-events", controller.expireEvents)
maintenanceRouter.post("/cleanup-logs", controller.cleanupLogs)
