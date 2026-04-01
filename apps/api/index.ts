import { webhookRoutes } from "./src/routes/webhook.router"

const PORT = Number(process.env["PORT"] ?? 3000)

Bun.serve({
  port: PORT,
  routes: {
    "/": () => new Response("OK"),
    ...webhookRoutes,
  },
  error(err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  },
})

console.log(`API server listening on port ${PORT}`)
