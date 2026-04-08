import { Router } from "express"
import { WebhookController } from "../controllers/webhook.controller"
import { requireAuth } from "../middleware/require-auth"
import { WebhookRepository } from "../repositories/webhook.repository"
import { WebhookService } from "../services/webhook.service"

const repository = new WebhookRepository()
const service = new WebhookService(repository)
const controller = new WebhookController(service)

export const webhookRouter = Router()

webhookRouter.use(requireAuth)

webhookRouter.get("/", controller.list)
webhookRouter.get("/:id", controller.getById)
webhookRouter.get("/:id/deliveries", controller.listDeliveries)
webhookRouter.get("/:id/logs", controller.listLogs)
webhookRouter.post("/:id/retry", controller.retry)
