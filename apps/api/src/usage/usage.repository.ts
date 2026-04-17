import { prisma } from "@workspace/db/client"

export class UsageRepository {
  getCurrentMonthUsage(userId: string, month: string) {
    return prisma.usage.findUnique({
      where: { userId_month: { userId, month } },
      select: { eventCount: true, month: true },
    })
  }

  getPlanForUser(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        plan: {
          select: {
            tier: true,
            eventsPerMonth: true,
            endpointLimit: true,
            retentionDays: true,
          },
        },
      },
    })
  }

  getActiveEndpointCount(userId: string) {
    return prisma.endpoint.count({
      where: {
        deletedAt: null,
        status: "active",
        project: { userId, deletedAt: null },
      },
    })
  }
}
