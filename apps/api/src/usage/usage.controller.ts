import type { Request, Response } from "express"
import { error, json } from "../lib/response"
import type { AuthenticatedRequest } from "../middleware/require-auth"
import type { UsageRepository } from "./usage.repository"

// Default limits applied when the user has no active subscription
const FREE_TIER_DEFAULTS = {
  tier: "FREE",
  eventsPerMonth: 10_000,
  endpointLimit: 3,
  retentionDays: 7,
} as const

export class UsageController {
  constructor(private readonly repo: UsageRepository) {}

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = (req as AuthenticatedRequest).user
      const month = new Date().toISOString().slice(0, 7) // "2026-04"

      const [usageRow, subscription, endpointsUsed] = await Promise.all([
        this.repo.getCurrentMonthUsage(userId, month),
        this.repo.getPlanForUser(userId),
        this.repo.getActiveEndpointCount(userId),
      ])

      const plan = subscription?.plan ?? FREE_TIER_DEFAULTS

      json(res, {
        currentMonth: month,
        eventCount: usageRow?.eventCount ?? 0,
        plan: {
          tier: plan.tier,
          eventsPerMonth: plan.eventsPerMonth,
          endpointLimit: plan.endpointLimit,
          retentionDays: plan.retentionDays,
        },
        endpoints: {
          used: endpointsUsed,
          limit: plan.endpointLimit,
        },
      })
    } catch (err) {
      console.error("[UsageController.get]", err)
      error(res, "Failed to fetch usage")
    }
  }
}
