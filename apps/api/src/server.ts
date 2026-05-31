import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { authRouter } from "./routes/auth.router"
import { endpointRouter } from "./routes/endpoint.router"
import { projectRouter } from "./routes/project.router"
import { webhookRouter } from "./routes/webhook.router"
import { alertRouter } from "./routes/alert.router"
import { usageRouter } from "./routes/usage.router"
import { maintenanceRouter } from "./routes/maintenance.router"
import { billingRouter, billingController } from "./billing/billing.router"
import { initAlertEvaluator } from "./lib/alert-evaluator"
import { startEventExpirationCron } from "./services/event-cron.service"
import { json } from "./lib/response"

const FRONTEND_URL = process.env["FRONTEND_URL"] ?? "http://localhost:3000"

const startServer = () => {
  const stripeKey = process.env["STRIPE_SECRET_KEY"]
  console.log("[debug] STRIPE_SECRET_KEY loaded:", stripeKey ? `${stripeKey.slice(0, 12)}...` : "MISSING")

  const app = express()

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  )

  // Stripe webhook must receive the raw body — mount BEFORE express.json()
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), billingController.handleWebhook)

  app.use((req, _res, next) => {
    console.log(`[req] ${req.method} ${req.path}`)
    next()
  })

  app.use(express.json())
  app.use(cookieParser())

  app.get("/", (_req, res) => json(res, { status: "ok" }))
  app.use("/api/auth", authRouter)
  app.use("/api/projects", projectRouter)
  app.use("/api/projects/:projectId/endpoints", endpointRouter)
  app.use("/api/webhooks", webhookRouter)
  app.use("/api/alerts", alertRouter)
  app.use("/api/usage", usageRouter)
  app.use("/api/billing", billingRouter)
  app.use("/api/maintenance", maintenanceRouter)

  const PORT = Number(process.env["PORT"]) || 5000
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    initAlertEvaluator()
    startEventExpirationCron()
  })
}

export default startServer
