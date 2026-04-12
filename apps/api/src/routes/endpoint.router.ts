import { Router } from "express"
import { EndpointController } from "../controllers/endpoint.controller"
import { requireAuth } from "../middleware/require-auth"
import { EndpointRepository } from "../repositories/endpoint.repository"
import { EndpointService } from "../services/endpoint.service"

const repository = new EndpointRepository()
const service = new EndpointService(repository)
const controller = new EndpointController(service)

export const endpointRouter = Router({ mergeParams: true })

endpointRouter.use(requireAuth)

endpointRouter.get("/", controller.list)
endpointRouter.post("/", controller.create)
endpointRouter.get("/:id", controller.getById)
endpointRouter.put("/:id", controller.update)
endpointRouter.patch("/:id/status", controller.updateStatus)
endpointRouter.delete("/:id", controller.delete)
endpointRouter.get("/:id/stats", controller.getStats)
endpointRouter.get("/:id/volume", controller.getVolume)
endpointRouter.get("/:id/delivery-stats", controller.getDeliveryStats)
