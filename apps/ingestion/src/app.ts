import Fastify from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import sensible from "@fastify/sensible"
import type { FastifyInstance } from "fastify"
import type { Env } from "./config/env.js"
import redisPlugin from "./plugins/redis.js"
import s3Plugin from "./plugins/s3.js"
import healthRoute from "./routes/health.js"
import ingestRoute from "./routes/ingest.js"

export async function buildApp(env: Env): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === "development" && {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss Z" },
        },
      }),
    },
    trustProxy: true,
  })

  // ─── Core plugins ──────────────────────────────────────────────────────────
  await fastify.register(helmet)
  await fastify.register(cors, { origin: env.NODE_ENV === "development" })
  await fastify.register(sensible)

  // ─── Infrastructure plugins ────────────────────────────────────────────────
  await fastify.register(redisPlugin, { url: env.REDIS_URL })

  await fastify.register(s3Plugin, {
    endpoint: env.S3_ENDPOINT,
    region: env.AWS_REGION,
    bucket: env.S3_BUCKET,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    createBucketIfMissing: true,
  })

  // ─── Routes ────────────────────────────────────────────────────────────────
  await fastify.register(healthRoute)
  await fastify.register(ingestRoute, { prefix: "/api/v1" })

  return fastify
}
