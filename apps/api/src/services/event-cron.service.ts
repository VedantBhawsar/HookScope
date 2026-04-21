import { EventExpirationService } from "./event-expiration.service"

const expirationService = new EventExpirationService()

const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

async function runExpiration() {
  try {
    const expired = await expirationService.expireOldEvents()
    console.log(`[event-cron] expired=${expired.deletedCount} users=${expired.processedUsers}`)

    const cleaned = await expirationService.cleanupDeletedEventLogs()
    console.log(`[event-cron] pruned=${cleaned.prunedCount} log entries`)
  } catch (err) {
    console.error("[event-cron] expiration run failed:", err)
  }
}

export function startEventExpirationCron() {
  runExpiration()
  setInterval(runExpiration, INTERVAL_MS)
  console.log("[event-cron] started — runs every 24h")
}
