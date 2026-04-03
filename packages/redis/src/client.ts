import type { RedisConfig } from "./types.js"

let instance: ReturnType<typeof createClient> | null = null

function createClient(config: RedisConfig = {}) {
  const url =
    config.url ??
    (config.host != null
      ? `redis://${config.password != null ? `:${config.password}@` : ""}${config.host}:${config.port ?? 6379}`
      : (process.env["REDIS_URL"] ?? "redis://localhost:6379"))

  return new Bun.RedisClient(url)
}

/**
 * Returns a singleton Redis client. Creates one on first call using the
 * provided config or falls back to the REDIS_URL environment variable.
 */
export function getRedisClient(config?: RedisConfig) {
  if (instance === null) {
    instance = createClient(config)
  }
  return instance
}

/**
 * Creates a new Redis client without caching. Useful when you need
 * an isolated connection (e.g. for pub/sub or testing).
 */
export function createRedisClient(config?: RedisConfig) {
  return createClient(config)
}
