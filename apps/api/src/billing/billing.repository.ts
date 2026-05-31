import { prisma, PlanTier, type SubscriptionStatus } from "@hookscope/db"

export class BillingRepository {
  async findPlanByTier(tier: PlanTier) {
    return prisma.plan.findUnique({ where: { tier } })
  }

  async findSubscriptionByUserId(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    })
  }

  async findSubscriptionByDodoId(dodoSubscriptionId: string) {
    return prisma.subscription.findUnique({
      where: { dodoSubscriptionId },
      include: { plan: true },
    })
  }

  async upsertSubscription(data: {
    userId: string
    planId: string
    status: SubscriptionStatus
    dodoCustomerId: string
    dodoSubscriptionId: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
  }) {
    return prisma.subscription.upsert({
      where: { userId: data.userId },
      create: {
        ...data,
        lastSyncedAt: new Date(),
      },
      update: {
        planId: data.planId,
        status: data.status,
        dodoCustomerId: data.dodoCustomerId,
        dodoSubscriptionId: data.dodoSubscriptionId,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        lastSyncedAt: new Date(),
      },
    })
  }

  async updateSubscriptionByDodoId(
    dodoSubscriptionId: string,
    data: {
      status: SubscriptionStatus
      currentPeriodStart?: Date
      currentPeriodEnd?: Date
      cancelAtPeriodEnd: boolean
      planId?: string
    }
  ) {
    return prisma.subscription.update({
      where: { dodoSubscriptionId },
      data: { ...data, lastSyncedAt: new Date() },
    })
  }
}
