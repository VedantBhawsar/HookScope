import { Router } from "express"
import multer from "multer"
import { AuthController } from "../controllers/auth.controller"
import { AuthRepository } from "../repositories/auth.repository"
import { AuthService } from "../services/auth.service"
import { requireAuth } from "../middleware/require-auth"

const repository = new AuthRepository()
const service = new AuthService(repository)
const controller = new AuthController(service)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

export const authRouter = Router()

authRouter.post("/register", controller.register)
authRouter.post("/login", controller.login)
authRouter.post("/refresh", controller.refresh)
authRouter.post("/logout", controller.logout)
authRouter.post("/logout-all", requireAuth, controller.logoutAll)
authRouter.patch("/onboarding", requireAuth, controller.completeOnboarding)
authRouter.patch("/profile", requireAuth, controller.updateProfile)
authRouter.get("/me", requireAuth, controller.me)
authRouter.post("/avatar", requireAuth, upload.single("avatar"), controller.uploadAvatar)
