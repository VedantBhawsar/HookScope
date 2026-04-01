import { WebhookController } from "../controllers/webhook.controller"
import { WebhookRepository } from "../repositories/webhook.repository"
import { WebhookService } from "../services/webhook.service"

const repository = new WebhookRepository()
const service = new WebhookService(repository)
const controller = new WebhookController(service)

export const webhookRoutes = {
  "/api/webhooks": {
    GET: controller.list,
    POST: controller.create,
  },
  "/api/webhooks/:id": {
    GET: controller.getById,
    PUT: controller.update,
    DELETE: controller.delete,
  },
} as const
