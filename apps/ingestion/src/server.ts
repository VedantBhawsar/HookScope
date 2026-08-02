import { loadIngestionEnv } from "@hookscope/env"
import { buildApp } from "./app.js"
import { createStripeWorker } from "./workers/stripe-event.worker.js"
import { createGitHubWorker } from "./workers/github-event.worker.js"
import { toConnectionOptions } from "@hookscope/redis"

const env = loadIngestionEnv()
const app = await buildApp(env)

const connectionOptions = toConnectionOptions({ url: env.REDIS_URL })
const stripeWorker = createStripeWorker(connectionOptions, {
  prisma: app.prisma,
  s3: app.s3,
  redis: app.redis,
  log: app.log,
})
const githubWorker = createGitHubWorker(connectionOptions, {
  prisma: app.prisma,
  s3: app.s3,
  redis: app.redis,
  log: app.log,
})

app.log.info("Stripe and GitHub event workers started")

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)

  console.log("error", err)
  process.exit(1)
}

// Graceful shutdown — drain workers before closing app
const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down ingestion server")
  await stripeWorker.close()
  await githubWorker.close()
  await app.close()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
