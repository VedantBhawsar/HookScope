import { Router } from "express"
import multer from "multer"
import { AuthController } from "../controllers/auth.controller"
import { AuthRepository } from "../repositories/auth.repository"
import { AuthService } from "../services/auth.service"
import { requireAuth } from "../middleware/require-auth"
import { forgotPasswordRateLimit, oauthCallbackRateLimit, otpSendRateLimit } from "../lib/rate-limit"

const repository = new AuthRepository()
const service = new AuthService(repository)
const controller = new AuthController(service)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

export const authRouter = Router()

// ── Email/password ────────────────────────────────────────────────────────────
authRouter.post("/register", controller.register)
authRouter.post("/login", controller.login)
authRouter.post("/refresh", controller.refresh)
authRouter.post("/logout", controller.logout)
authRouter.post("/logout-all", requireAuth, controller.logoutAll)

// ── Password reset ────────────────────────────────────────────────────────────
authRouter.post("/forgot-password", forgotPasswordRateLimit, controller.forgotPassword)
authRouter.post("/reset-password", controller.resetPassword)

// ── Onboarding / profile ──────────────────────────────────────────────────────
authRouter.patch("/onboarding", requireAuth, controller.completeOnboarding)
authRouter.patch("/profile", requireAuth, controller.updateProfile)
authRouter.get("/me", requireAuth, controller.me)
authRouter.post("/avatar", requireAuth, upload.single("avatar"), controller.uploadAvatar)

// ── Email verification ────────────────────────────────────────────────────────
authRouter.post("/verify-email/send", requireAuth, otpSendRateLimit, controller.sendEmailOtp)
authRouter.post("/verify-email/confirm", requireAuth, controller.confirmEmailOtp)

// ── Social OAuth (sign-in) ────────────────────────────────────────────────────
authRouter.get("/oauth/google", controller.googleOAuth)
authRouter.get("/oauth/google/callback", oauthCallbackRateLimit, controller.googleOAuthCallback)
authRouter.get("/oauth/github", controller.gitHubOAuth)
authRouter.get("/oauth/github/callback", oauthCallbackRateLimit, controller.gitHubOAuthCallback)

// ── Social OAuth (account linking — requires existing session) ────────────────
authRouter.get("/oauth/accounts", requireAuth, controller.getLinkedAccounts)
authRouter.delete("/oauth/:provider", requireAuth, controller.unlinkSocialAccount)
authRouter.get("/oauth/google/link", requireAuth, controller.googleOAuthLink)
authRouter.get("/oauth/google/link/callback", oauthCallbackRateLimit, controller.googleOAuthLinkCallback)
authRouter.get("/oauth/github/link", requireAuth, controller.gitHubOAuthLink)
authRouter.get("/oauth/github/link/callback", oauthCallbackRateLimit, controller.gitHubOAuthLinkCallback)
