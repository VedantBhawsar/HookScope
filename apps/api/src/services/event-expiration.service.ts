import { prisma } from "@workspace/db/client"

/**
 * Event expiration service — handles automatic deletion of old webhook events
 * based on user subscription plan retention policies.
 *
 * Events are soft-deleted (deletedAt set), not physically removed, allowing for
 * recovery and maintaining referential integrity.
 */
export class EventExpirationService {
  /**
   * Expire old webhook events based on subscription plan retention days.
   * Returns count of events soft-deleted.
   *
   * - Finds users with active subscriptions
   * - For each user, gets their plan's retentionDays
   * - Soft-deletes events older than retentionDays
   * - Non-subscribed users default to 30 days (free tier)
   */
  async expireOldEvents(): Promise<{ deletedCount: number; processedUsers: number }> {
    const FREE_TIER_RETENTION_DAYS = 30

    // Get all users with their active subscriptions and plan retention days
    const users = await prisma.user.findMany({
      select: {
        id: true,
        subscription: {
          select: {
            plan: { select: { retentionDays: true } },
          },
        },
      },
    })

    let totalDeleted = 0
    let processedCount = 0

    for (const user of users) {
      processedCount++

      // Determine retention days: use plan's retention or free tier default
      const retentionDays = user.subscription?.plan.retentionDays ?? FREE_TIER_RETENTION_DAYS
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      // Soft-delete all non-deleted events for this user older than cutoff
      const result = await prisma.webhookEvent.updateMany({
        where: {
          deletedAt: null, // Only non-deleted events
          createdAt: { lt: cutoffDate },
          endpoint: {
            project: { userId: user.id },
          },
        },
        data: { deletedAt: new Date() },
      })

      totalDeleted += result.count
    }

    return { deletedCount: totalDeleted, processedUsers: processedCount }
  }

  /**
   * Cleanup old logs for deleted events (optional, for space management).
   * Only deletes logs for events that have been deleted for > 90 days.
   */
  async cleanupDeletedEventLogs(): Promise<{ prunedCount: number }> {
    const CLEANUP_DELAY_DAYS = 90
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DELAY_DAYS)

    // Delete logs for events that were deleted long ago
    const result = await prisma.eventLog.deleteMany({
      where: {
        webhookEvent: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      },
    })

    return { prunedCount: result.count }
  }
}
