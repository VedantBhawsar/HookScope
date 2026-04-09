import { Redis } from "ioredis"
import type { RedisOptions } from "ioredis"
import type { RedisConfig } from "./types.js"

/**
 * Converts a RedisConfig into ioredis RedisOptions.
 * Exported so BullMQ and other consumers can share the same connection options
 * without sharing a single client instance.
 */
export function toConnectionOptions(config: RedisConfig = {}): RedisOptions {
  if (config.host != null) {
    return {
      host: config.host,
      port: config.port ?? 6379,
      ...(config.password ? { password: config.password } : {}),
      ...(config.tls ? { tls: {} } : {}),
    }
  }

  const url = config.url ?? process.env["REDIS_URL"] ?? "redis://localhost:6379"
  const parsed = new URL(url)

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(parsed.pathname && parsed.pathname !== "/" ? { db: parseInt(parsed.pathname.slice(1), 10) } : {}),
    ...(parsed.protocol === "rediss:" || config.tls ? { tls: {} } : {}),
  }
}

let instance: Redis | null = null

/**
 * Returns a singleton Redis client. Creates one on first call.
 */
export function getRedisClient(config?: RedisConfig): Redis {
  if (instance === null) {
    instance = new Redis(toConnectionOptions(config))
    instance.on("error", (err) => console.error("[redis] client error", err))
  }
  return instance
}

/**
 * Creates a new Redis client without caching.
 * Use when you need an isolated connection (e.g. pub/sub, BullMQ workers).
 */
export function createRedisClient(config?: RedisConfig): Redis {
  const client = new Redis(toConnectionOptions(config))
  client.on("error", (err) => console.error("[redis] client error", err))
  return client
}
