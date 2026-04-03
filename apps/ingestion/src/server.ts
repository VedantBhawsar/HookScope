import { loadEnv } from "./config/env.js"
import { buildApp } from "./app.js"

const env = loadEnv()
const app = await buildApp(env)

try {
  await app.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down ingestion server")
  await app.close()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
