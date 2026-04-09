import fp from "fastify-plugin"
import type { FastifyPluginAsync } from "fastify"
import type { Queue } from "bullmq"
import { toConnectionOptions } from "@workspace/redis"
import { createStripeQueue } from "../queues/stripe-event.queue.js"
import type { StripeEventJob } from "../queues/stripe-event.queue.js"

declare module "fastify" {
  interface FastifyInstance {
    stripeQueue: Queue<StripeEventJob>
  }
}

const queuePlugin: FastifyPluginAsync<{ redisUrl: string }> = async (fastify, opts) => {
  const queue = createStripeQueue(toConnectionOptions({ url: opts.redisUrl }))

  fastify.decorate("stripeQueue", queue)

  fastify.addHook("onClose", async () => {
    await queue.close()
  })

  fastify.log.info("Stripe event queue initialized")
}

export default fp(queuePlugin, { name: "stripe-queue", fastify: "5.x" })
