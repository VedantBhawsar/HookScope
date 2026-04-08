import type { AuthRepository } from "../repositories/auth.repository"
import {
  ACCESS_TOKEN_EXPIRES_IN,
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from "../lib/tokens"
import { hashPassword, verifyPassword } from "../lib/password"
import type { AuthResponse, LoginDto, RegisterDto } from "../types/auth"

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async register(dto: RegisterDto): Promise<AuthResponse & { refreshToken: string }> {
    const existing = await this.repo.findUserByEmail(dto.email)
    if (existing) throw new Error("EMAIL_TAKEN")

    const passwordHash = await hashPassword(dto.password)
    const user = await this.repo.createUser({ name: dto.name, email: dto.email, passwordHash })

    const { accessToken, refreshToken } = await this.issueTokenPair(user.id, user.email)
    return {
      user: { id: user.id, name: user.name, email: user.email },
      tokens: { accessToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      refreshToken,
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse & { refreshToken: string }> {
    const user = await this.repo.findUserByEmail(dto.email)
    // Constant-time: always verify to prevent timing-based user enumeration.
    const hashToCheck = user?.passwordHash ?? "$argon2id$v=19$m=65536,t=2,p=1$placeholder"
    const valid = await verifyPassword(dto.password, hashToCheck)
    if (!user || !valid) throw new Error("INVALID_CREDENTIALS")

    const { accessToken, refreshToken } = await this.issueTokenPair(user.id, user.email)
    return {
      user: { id: user.id, name: user.name, email: user.email },
      tokens: { accessToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      refreshToken,
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
    const { accessToken, refreshToken } = await this.issueTokenPairInFamily(
      stored.userId,
      stored.user.email,
      stored.family
    )
    return {
      user: { id: stored.user.id, name: stored.user.name, email: stored.user.email },
      tokens: { accessToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      refreshToken,
    }
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = await hashToken(rawRefreshToken)
    const stored = await this.repo.findRefreshToken(tokenHash)
    if (stored) await this.repo.revokeRefreshToken(stored.id)
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.repo.revokeAllUserTokens(userId)
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
}
