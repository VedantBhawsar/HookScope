import { Router } from "express"
import { ProjectController } from "../controllers/project.controller"
import { requireAuth } from "../middleware/require-auth"
import { ProjectRepository } from "../repositories/project.repository"
import { ProjectService } from "../services/project.service"

const repository = new ProjectRepository()
const service = new ProjectService(repository)
const controller = new ProjectController(service)

export const projectRouter = Router()

projectRouter.use(requireAuth)

projectRouter.get("/", controller.list)
projectRouter.post("/", controller.create)
projectRouter.get("/:id", controller.getById)
projectRouter.put("/:id", controller.update)
projectRouter.delete("/:id", controller.delete)
