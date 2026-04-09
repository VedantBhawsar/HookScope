import { loadEnv } from "./config/env.js"
import { buildApp } from "./app.js"
import { createStripeWorker } from "./workers/stripe-event.worker.js"
import { toConnectionOptions } from "@workspace/redis"

const env = loadEnv()
const app = await buildApp(env)

const worker = createStripeWorker(toConnectionOptions({ url: env.REDIS_URL }), {
  prisma: app.prisma,
  s3: app.s3,
  redis: app.redis,
  log: app.log,
})

app.log.info("Stripe event worker started")

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// Graceful shutdown — drain worker before closing app
const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down ingestion server")
  await worker.close()
  await app.close()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
