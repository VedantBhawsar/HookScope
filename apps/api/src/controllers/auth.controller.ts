import type { Request, Response } from "express"
import { badRequest, conflict, created, error, json, noContent, unauthorized } from "../lib/response"
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAuthCookies } from "../lib/cookies"
import { exchangeGitHubCode, exchangeGoogleCode, getGitHubAuthUrl, getGoogleAuthUrl } from "../lib/oauth"
import { generateRefreshToken } from "../lib/tokens"
import type { AuthService } from "../services/auth.service"
import type { AuthenticatedRequest } from "../middleware/require-auth"
import type { CompleteOnboardingDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto } from "../types/auth"

const FRONTEND_URL = (process.env["FRONTEND_URL"] ?? "http://localhost:3000").replace(/\/$/, "")
const OAUTH_STATE_COOKIE = "oauth_state"

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
      const result = await this.service.getSessionUser(userId)
      if (!result) return unauthorized(res)
      json(res, { user: result.user, subscription: result.subscription })
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

  // ── Forgot / reset password ──────────────────────────────────────────────────

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as Partial<ForgotPasswordDto>
      if (!body.email) return badRequest(res, "email is required")

      // Always respond 200 — do not reveal whether the email is registered
      await this.service.forgotPassword(body.email)
      json(res, null, 200, "If that email is registered you'll receive a reset link shortly")
    } catch (err) {
      console.error("[AuthController.forgotPassword]", err)
      error(res, "Failed to process request")
    }
  }

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as Partial<ResetPasswordDto>
      if (!body.token || !body.password) return badRequest(res, "token and password are required")
      if (body.password.length < 8) return badRequest(res, "password must be at least 8 characters")

      await this.service.resetPassword(body.token, body.password)
      json(res, null, 200, "Password updated. Please log in with your new password.")
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "INVALID_RESET_TOKEN") return badRequest(res, "Invalid or expired reset link")
        if (err.message === "TOKEN_ALREADY_USED") return badRequest(res, "This reset link has already been used")
        if (err.message === "RESET_TOKEN_EXPIRED") return badRequest(res, "This reset link has expired. Please request a new one.")
      }
      console.error("[AuthController.resetPassword]", err)
      error(res, "Password reset failed")
    }
  }

  // ── OAuth ────────────────────────────────────────────────────────────────────

  googleOAuth = (_req: Request, res: Response): void => {
    const state = generateRefreshToken().slice(0, 32) // random CSRF state
    res.cookie(OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", maxAge: 5 * 60 * 1000 })
    res.redirect(getGoogleAuthUrl(state))
  }

  googleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error: oauthError } = req.query as Record<string, string>

      if (oauthError) return res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_denied`) as unknown as void
      if (!code || !state) return res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed`) as unknown as void

      const storedState = req.cookies[OAUTH_STATE_COOKIE] as string | undefined
      if (!storedState || storedState !== state) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_state_mismatch`) as unknown as void
      }
      res.clearCookie(OAUTH_STATE_COOKIE)

      const profile = await exchangeGoogleCode(code)
      const result = await this.service.oauthSignin("GOOGLE", profile.providerAccountId, profile.email, profile.name, profile.avatarUrl)

      setAuthCookies(res, result.tokens.accessToken, result.refreshToken)

      // Route based on onboarding + payment status
      let dest = "/onboarding?step=verify"
      if (result.user.onboarding?.onboardingCompleted) {
        dest = result.subscription?.status === "active" ? "/projects" : "/pricing?returnTo=/projects"
      }
      res.redirect(`${FRONTEND_URL}${dest}`)
    } catch (err) {
      console.error("[AuthController.googleOAuthCallback]", err)
      res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed`)
    }
  }

  gitHubOAuth = (_req: Request, res: Response): void => {
    const state = generateRefreshToken().slice(0, 32)
    res.cookie(OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", maxAge: 5 * 60 * 1000 })
    res.redirect(getGitHubAuthUrl(state))
  }

  gitHubOAuthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error: oauthError } = req.query as Record<string, string>

      if (oauthError) return res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_denied`) as unknown as void
      if (!code || !state) return res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed`) as unknown as void

      const storedState = req.cookies[OAUTH_STATE_COOKIE] as string | undefined
      if (!storedState || storedState !== state) {
        return res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_state_mismatch`) as unknown as void
      }
      res.clearCookie(OAUTH_STATE_COOKIE)

      const profile = await exchangeGitHubCode(code)
      const result = await this.service.oauthSignin("GITHUB", profile.providerAccountId, profile.email, profile.name, profile.avatarUrl)

      setAuthCookies(res, result.tokens.accessToken, result.refreshToken)

      // Route based on onboarding + payment status
      let dest = "/onboarding?step=verify"
      if (result.user.onboarding?.onboardingCompleted) {
        dest = result.subscription?.status === "active" ? "/projects" : "/pricing?returnTo=/projects"
      }
      res.redirect(`${FRONTEND_URL}${dest}`)
    } catch (err) {
      console.error("[AuthController.gitHubOAuthCallback]", err)
      res.redirect(`${FRONTEND_URL}/auth/login?error=oauth_failed`)
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
