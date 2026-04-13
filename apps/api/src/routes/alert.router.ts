import { Router } from "express"
import { requireAuth } from "../middleware/require-auth"
import { AlertRepository } from "../alerts/alert.repository"
import { AlertService } from "../alerts/alert.service"
import { AlertController } from "../alerts/alert.controller"

const repository = new AlertRepository()
const service = new AlertService(repository)
const controller = new AlertController(service)

export const alertRouter = Router()

alertRouter.use(requireAuth)

// NOTE: /stream and /history must be registered before /:id to avoid param collision
alertRouter.get("/stream", controller.stream)
alertRouter.get("/history", controller.listAllTriggers)

alertRouter.get("/", controller.list)
alertRouter.post("/", controller.create)
alertRouter.get("/:id", controller.getById)
alertRouter.patch("/:id", controller.update)
alertRouter.delete("/:id", controller.delete)
alertRouter.get("/:id/triggers", controller.listTriggers)
alertRouter.post("/:id/test-trigger", controller.createTestTrigger)
