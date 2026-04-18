import { prisma, PlanTier, type SubscriptionStatus } from "@workspace/db"

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

  async upsertSubscription(data: {
    userId: string
    planId: string
    status: SubscriptionStatus
    stripeCustomerId: string
    stripeSubscriptionId: string
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
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        lastSyncedAt: new Date(),
      },
    })
  }

  async updateSubscriptionByStripeId(
    stripeSubscriptionId: string,
    data: {
      status: SubscriptionStatus
      currentPeriodStart: Date
      currentPeriodEnd: Date
      cancelAtPeriodEnd: boolean
    }
  ) {
    return prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: { ...data, lastSyncedAt: new Date() },
    })
  }
}
