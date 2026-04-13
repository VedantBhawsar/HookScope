import type { Response } from "express"

/**
 * SseManager — singleton registry of open SSE connections, keyed by userId.
 *
 * Each user may have multiple browser tabs open (multiple connections).
 * When an alert fires, all connections for that user receive the event.
 */
class SseManager {
  private readonly connections = new Map<string, Set<Response>>()

  add(userId: string, res: Response): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set())
    }
    this.connections.get(userId)!.add(res)
  }

  remove(userId: string, res: Response): void {
    const set = this.connections.get(userId)
    if (!set) return
    set.delete(res)
    if (set.size === 0) this.connections.delete(userId)
  }

  /** Send an SSE event to all connections for a single user. */
  send(userId: string, event: string, data: unknown): void {
    const set = this.connections.get(userId)
    if (!set || set.size === 0) return
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of set) {
      try {
        res.write(payload)
      } catch {
        // Connection already closed — remove it
        set.delete(res)
      }
    }
  }

  /** Send an SSE event to multiple users (e.g. broadcast). */
  broadcast(userIds: string[], event: string, data: unknown): void {
    for (const userId of userIds) {
      this.send(userId, event, data)
    }
  }

  connectionCount(): number {
    let total = 0
    for (const set of this.connections.values()) total += set.size
    return total
  }
}

export const sseManager = new SseManager()
