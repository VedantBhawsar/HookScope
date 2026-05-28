import fp from "fastify-plugin"
import type { FastifyPluginAsync } from "fastify"
import { getRedisClient } from "@hookscope/redis"
import type { Redis, RedisConfig } from "@hookscope/redis"

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis
  }
}

interface RedisPluginOptions extends RedisConfig {}

const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (fastify, opts) => {
  const client = getRedisClient(opts)

  fastify.decorate("redis", client)

  fastify.addHook("onClose", async () => {
    await client.quit()
  })

  fastify.log.info("Redis client connected")
}

export default fp(redisPlugin, {
  name: "redis",
  fastify: "5.x",
})
