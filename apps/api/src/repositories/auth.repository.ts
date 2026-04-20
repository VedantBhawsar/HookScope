import { prisma } from "@workspace/db/client"
import type { OAuthProvider } from "@workspace/db"

export class AuthRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  createUser(data: { name: string; email: string; passwordHash: string }) {
    return prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash: data.passwordHash },
    })
  }

  getActiveProjectCount(userId: string) {
    return prisma.project.count({
      where: {
        userId,
        deletedAt: null,
      },
    })
  }

  updateUserOnboarding(
    userId: string,
    data: {
      companyName: string
      companySize?: string
      companyRole?: string
      useCase?: string
      onboardingCompletedAt?: Date
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        companyName: data.companyName,
        companySize: data.companySize,
        companyRole: data.companyRole,
        useCase: data.useCase,
        onboardingCompletedAt: data.onboardingCompletedAt,
      },
    })
  }

  createRefreshToken(data: {
    userId: string
    tokenHash: string
    family: string
    expiresAt: Date
  }) {
    return prisma.refreshToken.create({ data })
  }

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  }

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  /** Revoke all tokens in a family — called on theft detection. */
  revokeTokenFamily(family: string) {
    return prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  /** Revoke all active tokens for a user — "logout all devices". */
  revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  updateUserAvatar(userId: string, avatarUrl: string | null) {
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })
  }

  updateUserProfile(
    userId: string,
    data: {
      name?: string
      companyName?: string
      companySize?: string
      companyRole?: string
      useCase?: string
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.companySize !== undefined && { companySize: data.companySize }),
        ...(data.companyRole !== undefined && { companyRole: data.companyRole }),
        ...(data.useCase !== undefined && { useCase: data.useCase }),
      },
    })
  }

  // ── Password reset ────────────────────────────────────────────────────────────

  createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data })
  }

  findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })
  }

  markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }

  /** Clean up unused unexpired tokens for a user before issuing a new one. */
  deleteUnusedResetTokensForUser(userId: string) {
    return prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    })
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }

  // ── OAuth accounts ────────────────────────────────────────────────────────────

  /** Look up the OAuthAccount row and include the linked user. */
  findOAuthAccount(provider: OAuthProvider, providerAccountId: string) {
    return prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    })
  }

  /** Create a new user without a password (OAuth-only sign-up). */
  createOAuthUser(data: { name: string; email: string; avatarUrl?: string }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        // passwordHash intentionally null — user authenticates via OAuth only
        emailVerifiedAt: new Date(), // provider verified the email
      },
    })
  }

  /** Attach an OAuth provider account to an existing user and mark email verified. */
  async linkOAuthAccount(userId: string, provider: OAuthProvider, providerAccountId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() }, // provider verified the email
    })
    return prisma.oAuthAccount.create({
      data: { userId, provider, providerAccountId },
    })
  }

  /** Fetch active subscription for a user. */
  getUserSubscription(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        plan: { select: { tier: true } },
      },
    })
  }
}
