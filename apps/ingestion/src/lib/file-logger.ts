import { appendFile } from "node:fs/promises"
import { resolve } from "node:path"

const LOG_FILE = resolve(process.cwd(), "log.txt")

export interface LogEntry {
  timestamp: string
  source: string
  eventType: string
  eventId: string
  headers: Record<string, string | undefined>
  data: unknown
}

/**
 * Appends a structured log entry as a JSON line to log.txt.
 * Falls back silently on write failure to avoid crashing the request.
 */
export async function appendLog(entry: LogEntry): Promise<void> {
  const line = JSON.stringify(entry) + "\n"
  try {
    await appendFile(LOG_FILE, line, "utf8")
  } catch (err) {
    // Non-fatal — the main request flow must not be disrupted by log IO errors
    console.error("[file-logger] Failed to write to log.txt:", err)
  }
}
