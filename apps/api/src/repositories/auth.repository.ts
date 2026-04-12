import { prisma } from "@workspace/db/client"

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
}
