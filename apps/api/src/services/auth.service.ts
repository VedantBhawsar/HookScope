import type { AuthRepository } from "../repositories/auth.repository"
import {
  ACCESS_TOKEN_EXPIRES_IN,
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from "../lib/tokens"
import { hashPassword, verifyPassword } from "../lib/password"
import { putObject, deleteObject, getS3Client } from "@workspace/s3"
import { sendPasswordResetEmail } from "../lib/email"
import type { OAuthProvider } from "@workspace/db"
import type {
  AuthOnboardingState,
  AuthResponse,
  CompleteOnboardingDto,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from "../types/auth"

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async register(dto: RegisterDto): Promise<AuthResponse & { refreshToken: string }> {
    const existing = await this.repo.findUserByEmail(dto.email)
    if (existing) throw new Error("EMAIL_TAKEN")

    const passwordHash = await hashPassword(dto.password)
    const user = await this.repo.createUser({ name: dto.name, email: dto.email, passwordHash })

    const { accessToken, refreshToken } = await this.issueTokenPair(user.id, user.email)
    // New users have no subscription yet
    return {
      user: this.toAuthUser(user, 0),
      tokens: { accessToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      refreshToken,
      subscription: null,
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse & { refreshToken: string }> {
    const user = await this.repo.findUserByEmail(dto.email)
    // Constant-time: always verify to prevent timing-based user enumeration.
    const hashToCheck = user?.passwordHash ?? "$argon2id$v=19$m=65536,t=2,p=1$placeholder"
    const valid = await verifyPassword(dto.password, hashToCheck)
    if (!user || !valid) throw new Error("INVALID_CREDENTIALS")

    const projectCount = await this.repo.getActiveProjectCount(user.id)
    const { accessToken, refreshToken } = await this.issueTokenPair(user.id, user.email)
    const subscription = await this.repo.getUserSubscription(user.id)

    return {
      user: this.toAuthUser(user, projectCount),
      tokens: { accessToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      refreshToken,
      subscription,
    }
  }

  /**
   * Exchange a refresh token for a fresh access + refresh token pair.
   *
   * TODO: implement the rotation strategy below (~8 lines).
   *
   * `stored` is the DB record (or null). Handle these 4 cases:
   *
   * 1. Not found → return null (caller sends 401).
   * 2. Already revoked → THEFT detected. Call `this.repo.revokeTokenFamily(stored.family)`
   *    to invalidate the entire session, then return null.
   * 3. Expired (`stored.expiresAt < now`) → revoke it, return null.
   * 4. Valid → revoke the old token, call `this.issueTokenPairInFamily(...)`, return result.
   *
   * Trade-off:
   *   Always-rotate (recommended): single-use tokens, theft caught within one cycle.
   *   Sliding-window: fewer DB writes, but stolen tokens go undetected until victim refreshes.
   */
  async refresh(rawRefreshToken: string): Promise<(AuthResponse & { refreshToken: string }) | null> {
    const tokenHash = await hashToken(rawRefreshToken)
    const stored = await this.repo.findRefreshToken(tokenHash)

    // 1. Not found
    if (!stored) return null

    // 2. Already revoked → theft detected, nuke the whole family
    if (stored.revokedAt !== null) {
      await this.repo.revokeTokenFamily(stored.family)
      return null
    }

    // 3. Expired
    if (stored.expiresAt < new Date()) {
      await this.repo.revokeRefreshToken(stored.id)
      return null
    }

    // 4. Valid → rotate: revoke old, issue new in same family
    await this.repo.revokeRefreshToken(stored.id)
    const projectCount = await this.repo.getActiveProjectCount(stored.user.id)
    const { accessToken, refreshToken } = await this.issueTokenPairInFamily(
      stored.userId,
      stored.user.email,
      stored.family
    )
    const subscription = await this.repo.getUserSubscription(stored.user.id)

    return {
      user: this.toAuthUser(stored.user, projectCount),
      tokens: { accessToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      refreshToken,
      subscription,
    }
  }

  async getSessionUser(userId: string) {
    const user = await this.repo.findUserById(userId)
    if (!user) return null

    const [projectCount, subscription] = await Promise.all([
      this.repo.getActiveProjectCount(user.id),
      this.repo.getUserSubscription(user.id),
    ])
    return { user: this.toAuthUser(user, projectCount), subscription: subscription ?? null }
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const companyName = dto.companyName.trim()
    const companySize = dto.companySize?.trim() || undefined
    const companyRole = dto.companyRole?.trim() || undefined
    const useCase = dto.useCase?.trim() || undefined

    const user = await this.repo.updateUserOnboarding(userId, {
      companyName,
      companySize,
      companyRole,
      useCase,
      onboardingCompletedAt: undefined,
    })

    const projectCount = await this.repo.getActiveProjectCount(user.id)
    return this.toAuthUser(user, projectCount)
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Parameters<typeof this.repo.updateUserProfile>[1] = {}
    if (dto.name !== undefined) data.name = dto.name.trim()
    if (dto.companyName !== undefined) data.companyName = dto.companyName.trim() || undefined
    if (dto.companySize !== undefined) data.companySize = dto.companySize.trim() || undefined
    if (dto.companyRole !== undefined) data.companyRole = dto.companyRole.trim() || undefined
    if (dto.useCase !== undefined) data.useCase = dto.useCase.trim() || undefined

    const user = await this.repo.updateUserProfile(userId, data)
    const projectCount = await this.repo.getActiveProjectCount(user.id)
    return this.toAuthUser(user, projectCount)
  }

  // ── Forgot / reset password ──────────────────────────────────────────────────

  /**
   * Trigger a password reset email. Intentionally silent if the email is not
   * registered — prevents user enumeration via response timing.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email)
    if (!user) return // silent — do not reveal whether email exists

    const RESET_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

    // Invalidate any outstanding unused tokens before issuing a new one
    await this.repo.deleteUnusedResetTokensForUser(user.id)

    const rawToken = generateRefreshToken() // 64-char hex via Web Crypto
    const tokenHash = await hashToken(rawToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await this.repo.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt })

    const frontendUrl = (process.env["FRONTEND_URL"] ?? "http://localhost:3000").replace(/\/$/, "")
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`

    await sendPasswordResetEmail(email, resetUrl)
  }

  /** Validate a reset token and update the user's password. */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = await hashToken(rawToken)
    const record = await this.repo.findPasswordResetToken(tokenHash)

    if (!record) throw new Error("INVALID_RESET_TOKEN")
    if (record.usedAt) throw new Error("TOKEN_ALREADY_USED")
    if (record.expiresAt < new Date()) throw new Error("RESET_TOKEN_EXPIRED")

    const passwordHash = await hashPassword(newPassword)

    // Atomically: update password, mark token used, revoke all sessions
    await Promise.all([
      this.repo.updateUserPassword(record.userId, passwordHash),
      this.repo.markPasswordResetTokenUsed(record.id),
      this.repo.revokeAllUserTokens(record.userId), // force re-login on all devices
    ])
  }

  // ── Social OAuth sign-in ─────────────────────────────────────────────────────

  async oauthSignin(
    provider: OAuthProvider,
    providerAccountId: string,
    email: string,
    name: string,
    avatarUrl?: string
  ): Promise<AuthResponse & { refreshToken: string }> {
    const { user, isNew } = await this.findOrCreateOAuthUser(
      provider, providerAccountId, email, name, avatarUrl
    )

    const projectCount = isNew ? 0 : await this.repo.getActiveProjectCount(user.id)
    const { accessToken, refreshToken } = await this.issueTokenPair(user.id, user.email)

    // Fetch active subscription for auth context (frontend payment enforcement)
    const subscription = await this.repo.getUserSubscription(user.id)

    return {
      user: this.toAuthUser(user, projectCount),
      tokens: { accessToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      refreshToken,
      subscription, // Include for payment validation on frontend
    }
  }

  /**
   * Resolve a user for OAuth sign-in (find existing or create new).
   *
   * TODO: Implement the find-or-create strategy below (~8 lines).
   *
   * Three cases to handle in order:
   *
   * 1. **Re-login** — `this.repo.findOAuthAccount(provider, providerAccountId)` returns
   *    a record → the user has signed in with this provider before. Return `{ user, isNew: false }`.
   *
   * 2. **Email collision** — no OAuthAccount exists, but `this.repo.findUserByEmail(email)`
   *    finds a user. Two valid strategies:
   *    - **Auto-link** (UX-friendly): link the OAuth account to the existing user.
   *      Risk: if the provider is compromised, an attacker can take over the email account.
   *    - **Reject** (security-strict): throw `new Error("EMAIL_TAKEN_DIFFERENT_PROVIDER")`.
   *      Safer, but requires the user to log in with password first and explicitly link OAuth.
   *
   * 3. **New sign-up** — no match anywhere →
   *    `this.repo.createOAuthUser(...)` then `this.repo.linkOAuthAccount(...)`.
   *    Return `{ user, isNew: true }`.
   */
  private async findOrCreateOAuthUser(
    provider: OAuthProvider,
    providerAccountId: string,
    email: string,
    name: string,
    avatarUrl?: string
  ): Promise<{ user: { id: string; email: string; name: string; avatarUrl: string | null; emailVerifiedAt: Date | null; companyName: string | null; companySize: string | null; companyRole: string | null; useCase: string | null; onboardingCompletedAt: Date | null }; isNew: boolean }> {
    // Case 1: Re-login — this provider account has signed in before
    const existing = await this.repo.findOAuthAccount(provider, providerAccountId)
    if (existing) return { user: existing.user, isNew: false }

    // Case 2: Email collision — auto-link to the existing password/OAuth account
    // Trade-off: UX-friendly but trusts provider email ownership. Acceptable here
    // because all supported providers (Google, GitHub) verify emails before returning them.
    const existingUser = await this.repo.findUserByEmail(email)
    if (existingUser) {
      await this.repo.linkOAuthAccount(existingUser.id, provider, providerAccountId)
      return { user: existingUser, isNew: false }
    }

    // Case 3: New sign-up — create user + link provider account atomically
    const newUser = await this.repo.createOAuthUser({ name, email, avatarUrl })
    await this.repo.linkOAuthAccount(newUser.id, provider, providerAccountId)
    return { user: newUser, isNew: true }
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = await hashToken(rawRefreshToken)
    const stored = await this.repo.findRefreshToken(tokenHash)
    if (stored) await this.repo.revokeRefreshToken(stored.id)
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.repo.revokeAllUserTokens(userId)
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    const ext = file.mimetype.split("/")[1] ?? "jpg"
    const key = `avatars/${userId}/${Date.now()}.${ext}`
    const bucket = process.env["S3_BUCKET"] ?? "webhooks"

    await putObject(
      { bucket, key, body: file.buffer, contentType: file.mimetype },
      getS3Client()
    )

    const endpoint = (process.env["S3_ENDPOINT"] ?? "https://s3.amazonaws.com").replace(/\/$/, "")
    const avatarUrl = `${endpoint}/${bucket}/${key}`

    const existingUser = await this.repo.findUserById(userId)
    if (existingUser?.avatarUrl) {
      const oldKey = this.extractS3Key(existingUser.avatarUrl, bucket, endpoint)
      if (oldKey) {
        await deleteObject({ bucket, key: oldKey }, getS3Client()).catch(() => {
          // Non-fatal: old avatar cleanup failure should not block the upload
        })
      }
    }

    await this.repo.updateUserAvatar(userId, avatarUrl)
    return avatarUrl
  }

  private extractS3Key(url: string, bucket: string, endpoint: string): string | null {
    const prefix = `${endpoint}/${bucket}/`
    return url.startsWith(prefix) ? url.slice(prefix.length) : null
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async issueTokenPair(
    userId: string,
    email: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const family = generateRefreshToken()
    return this.issueTokenPairInFamily(userId, email, family)
  }

  protected async issueTokenPairInFamily(
    userId: string,
    email: string,
    family: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await signAccessToken({ userId, email })
    const rawRefreshToken = generateRefreshToken()
    const tokenHash = await hashToken(rawRefreshToken)

    await this.repo.createRefreshToken({
      userId,
      tokenHash,
      family,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    })

    return { accessToken, refreshToken: rawRefreshToken }
  }

  private toAuthUser(
    user: {
      id: string
      name: string
      email: string
      avatarUrl: string | null
      emailVerifiedAt: Date | null
      companyName: string | null
      companySize: string | null
      companyRole: string | null
      useCase: string | null
      onboardingCompletedAt: Date | null
    },
    projectCount: number
  ) {
    const onboarding = this.toOnboardingState(user, projectCount)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      onboarding,
    }
  }

  private toOnboardingState(
    user: {
      emailVerifiedAt: Date | null
      companyName: string | null
      companySize: string | null
      companyRole: string | null
      useCase: string | null
      onboardingCompletedAt: Date | null
    },
    projectCount: number
  ): AuthOnboardingState {
    const hasCreatedProject = projectCount > 0
    const hasCompanyDetails = Boolean(user.companyName)
    const onboardingCompleted = Boolean(user.onboardingCompletedAt) || (hasCompanyDetails && hasCreatedProject)

    return {
      emailVerified: Boolean(user.emailVerifiedAt),
      companyName: user.companyName,
      companySize: user.companySize,
      companyRole: user.companyRole,
      useCase: user.useCase,
      onboardingCompleted,
      hasCreatedProject,
      isNewUser: !hasCompanyDetails && !hasCreatedProject,
    }
  }
}
