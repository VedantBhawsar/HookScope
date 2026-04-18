import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { authRouter } from "./routes/auth.router"
import { endpointRouter } from "./routes/endpoint.router"
import { projectRouter } from "./routes/project.router"
import { webhookRouter } from "./routes/webhook.router"
import { alertRouter } from "./routes/alert.router"
import { usageRouter } from "./routes/usage.router"
import { billingRouter, billingController } from "./billing/billing.router"
import { initAlertEvaluator } from "./lib/alert-evaluator"
import { json } from "./lib/response"

const FRONTEND_URL = process.env["FRONTEND_URL"] ?? "http://localhost:3000"

const startServer = () => {
  const app = express()

  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
    })
  )

  // Stripe webhook must receive the raw body — mount BEFORE express.json()
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

  const PORT = 5000
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    initAlertEvaluator()
  })
}

export default startServer
