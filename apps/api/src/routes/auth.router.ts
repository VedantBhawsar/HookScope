import { Router } from "express"
import { AuthController } from "../controllers/auth.controller"
import { AuthRepository } from "../repositories/auth.repository"
import { AuthService } from "../services/auth.service"
import { requireAuth } from "../middleware/require-auth"

const repository = new AuthRepository()
const service = new AuthService(repository)
const controller = new AuthController(service)

export const authRouter = Router()

authRouter.post("/register", controller.register)
authRouter.post("/login", controller.login)
authRouter.post("/refresh", controller.refresh)
authRouter.post("/logout", controller.logout)
authRouter.post("/logout-all", requireAuth, controller.logoutAll)
authRouter.get("/me", requireAuth, controller.me)
