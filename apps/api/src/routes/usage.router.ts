import { Router } from "express"
import { UsageController } from "../usage/usage.controller"
import { UsageRepository } from "../usage/usage.repository"
import { requireAuth } from "../middleware/require-auth"

const repository = new UsageRepository()
const controller = new UsageController(repository)

export const usageRouter = Router()

usageRouter.use(requireAuth)
usageRouter.get("/", controller.get)
