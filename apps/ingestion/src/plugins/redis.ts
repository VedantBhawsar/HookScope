import fp from "fastify-plugin"
import type { FastifyPluginAsync } from "fastify"
import { getRedisClient } from "@workspace/redis"
import type { RedisConfig } from "@workspace/redis"

declare module "fastify" {
  interface FastifyInstance {
    redis: ReturnType<typeof getRedisClient>
  }
}

interface RedisPluginOptions extends RedisConfig {}

const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (
  fastify,
  opts
) => {
  const client = getRedisClient(opts)

  fastify.decorate("redis", client)

  fastify.addHook("onClose", () => {
    client.close()
  })

  fastify.log.info("Redis client connected")
}

export default fp(redisPlugin, {
  name: "redis",
  fastify: "5.x",
})
