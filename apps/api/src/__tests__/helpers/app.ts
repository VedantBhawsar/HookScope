import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { authRouter } from "../../routes/auth.router"
import { endpointRouter } from "../../routes/endpoint.router"
import { projectRouter } from "../../routes/project.router"
import { webhookRouter } from "../../routes/webhook.router"
import { alertRouter } from "../../routes/alert.router"
import { usageRouter } from "../../routes/usage.router"
import { maintenanceRouter } from "../../routes/maintenance.router"
import { billingRouter, billingController } from "../../billing/billing.router"
import { json } from "../../lib/response"
import { type Express } from "express"


export const createApp = (): Express => {
  const app = express()

  app.use(cors({ origin: true, credentials: true }))

  // Billing webhook must receive raw body — mount BEFORE express.json()
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), billingController.handleWebhook)

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

  return app
}
