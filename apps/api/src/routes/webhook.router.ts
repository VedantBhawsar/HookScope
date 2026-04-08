import { Router } from "express"
import { WebhookController } from "../controllers/webhook.controller"
import { WebhookRepository } from "../repositories/webhook.repository"
import { WebhookService } from "../services/webhook.service"

const repository = new WebhookRepository()
const service = new WebhookService(repository)
const controller = new WebhookController(service)

export const webhookRouter = Router()

webhookRouter.get("/", controller.list)
webhookRouter.post("/", controller.create)
webhookRouter.get("/:id", controller.getById)
webhookRouter.put("/:id", controller.update)
webhookRouter.delete("/:id", controller.delete)
