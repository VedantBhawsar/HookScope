import express from "express"
import cookieParser from "cookie-parser"
import { authRouter } from "./routes/auth.router"
import { webhookRouter } from "./routes/webhook.router"

const startServer = () => {
  const app = express()

  app.use(express.json())
  app.use(cookieParser())

  app.get("/", (_req, res) => res.json({ status: "ok" }))
  app.use("/api/auth", authRouter)
  app.use("/api/webhooks", webhookRouter)

  const PORT = 5000
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
}

export default startServer
