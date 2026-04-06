import fp from "fastify-plugin"
import type { FastifyInstance } from "fastify"

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

/**
 * Captures the raw request body as a Buffer on `request.rawBody`.
 * Required for Stripe signature verification which needs the exact bytes.
 */
export default fp(async function rawBodyPlugin(fastify: FastifyInstance) {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      const rawBody = body as Buffer
      // Attach raw bytes for signature verification
      ;(req as unknown as { rawBody: Buffer }).rawBody = rawBody

      try {
        const parsed = JSON.parse(rawBody.toString("utf-8"))
        done(null, parsed)
      } catch (err) {
        done(err as Error, undefined)
      }
    }
  )
})
