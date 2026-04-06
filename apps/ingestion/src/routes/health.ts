import type { FastifyPluginAsync } from "fastify"

const healthRoute: FastifyPluginAsync = async (fastify) => {
  const healthResponseSchema = {
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
          timestamp: { type: "string" },
          uptime: { type: "number" },
        },
      },
    },
  } as const

  const handler = async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }
  
  fastify.get("/health-check", { schema: healthResponseSchema }, handler)
}

export default healthRoute
