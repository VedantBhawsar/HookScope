import type { Request, Response } from "express"
import { badRequest, conflict, created, error, json, noContent, unauthorized } from "../lib/response"
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from "../lib/cookies"
import type { AuthService } from "../services/auth.service"
import type { AuthenticatedRequest } from "../middleware/require-auth"
import type { CompleteOnboardingDto, LoginDto, RegisterDto, UpdateProfileDto } from "../types/auth"

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as Partial<RegisterDto>
      if (!body.name || !body.email || !body.password) {
        return badRequest(res, "name, email, and password are required")
      }
      if (body.password.length < 8) {
        return badRequest(res, "password must be at least 8 characters")
      }

      const result = await this.service.register(body as RegisterDto)
      setAuthCookies(res, result.tokens.accessToken, result.refreshToken)
      created(res, { user: result.user, tokens: result.tokens }, "Account created successfully")
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_TAKEN") {
        return conflict(res, "Email is already registered")
      }
      console.error("[AuthController.register]", err)
      error(res, "Registration failed")
    }
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as Partial<LoginDto>
      if (!body.email || !body.password) {
        return badRequest(res, "email and password are required")
      }

      const result = await this.service.login(body as LoginDto)
      setAuthCookies(res, result.tokens.accessToken, result.refreshToken)
      json(res, { user: result.user, tokens: result.tokens }, 200, "Logged in successfully")
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
        return unauthorized(res, "Invalid email or password")
      }
      console.error("[AuthController.login]", err)
      error(res, "Login failed")
    }
  }

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined
      if (!rawRefreshToken) return unauthorized(res, "Missing refresh token")

      const result = await this.service.refresh(rawRefreshToken)
      if (!result) return unauthorized(res, "Invalid or expired refresh token")

      setAuthCookies(res, result.tokens.accessToken, result.refreshToken)
      json(res, { user: result.user, tokens: result.tokens })
    } catch (err) {
      console.error("[AuthController.refresh]", err)
      error(res, "Token refresh failed")
    }
  }

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined
      if (rawRefreshToken) await this.service.logout(rawRefreshToken)
      clearAuthCookies(res)
      noContent(res, "Logged out successfully")
    } catch (err) {
      console.error("[AuthController.logout]", err)
      error(res, "Logout failed")
    }
  }

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as Request & { user: { userId: string } }).user?.userId
      if (!userId) return unauthorized(res)
      await this.service.logoutAllDevices(userId)
      clearAuthCookies(res)
      noContent(res)
    } catch (err) {
      console.error("[AuthController.logoutAll]", err)
      error(res, "Logout failed")
    }
  }

  completeOnboarding = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const body = req.body as Partial<CompleteOnboardingDto>

      if (!body.companyName?.trim()) {
        return badRequest(res, "companyName is required")
      }

      const user = await this.service.completeOnboarding(userId, body as CompleteOnboardingDto)
      json(res, { user }, 200, "Onboarding details saved")
    } catch (err) {
      console.error("[AuthController.completeOnboarding]", err)
      error(res, "Failed to save onboarding details")
    }
  }

  me = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const user = await this.service.getSessionUser(userId)
      if (!user) return unauthorized(res)
      json(res, { user })
    } catch (err) {
      console.error("[AuthController.me]", err)
      error(res, "Failed to fetch session")
    }
  }

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const body = req.body as Partial<UpdateProfileDto>

      if (body.name !== undefined && !body.name.trim()) {
        return badRequest(res, "name cannot be empty")
      }

      const user = await this.service.updateProfile(userId, body)
      json(res, { user }, 200, "Profile updated")
    } catch (err) {
      console.error("[AuthController.updateProfile]", err)
      error(res, "Failed to update profile")
    }
  }

  uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const file = req.file
      if (!file) return badRequest(res, "No image file provided")

      const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return badRequest(res, "File must be a JPEG, PNG, WebP, or GIF image")
      }

      const avatarUrl = await this.service.uploadAvatar(userId, file)
      json(res, { avatarUrl }, 200, "Avatar uploaded successfully")
    } catch (err) {
      console.error("[AuthController.uploadAvatar]", err)
      error(res, "Failed to upload avatar")
    }
  }
}
