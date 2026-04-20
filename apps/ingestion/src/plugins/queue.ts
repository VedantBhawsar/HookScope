import fp from "fastify-plugin"
import type { FastifyPluginAsync } from "fastify"
import type { Queue } from "bullmq"
import { toConnectionOptions } from "@workspace/redis"
import { createStripeQueue } from "../queues/stripe-event.queue.js"
import { createGitHubQueue } from "../queues/github-event.queue.js"
import type { StripeEventJob } from "../queues/stripe-event.queue.js"
import type { GitHubEventJob } from "../queues/github-event.queue.js"

declare module "fastify" {
  interface FastifyInstance {
    stripeQueue: Queue<StripeEventJob>
    githubQueue: Queue<GitHubEventJob>
  }
}

const queuePlugin: FastifyPluginAsync<{ redisUrl: string }> = async (fastify, opts) => {
  const connectionOptions = toConnectionOptions({ url: opts.redisUrl })
  const stripeQueue = createStripeQueue(connectionOptions)
  const githubQueue = createGitHubQueue(connectionOptions)

  fastify.decorate("stripeQueue", stripeQueue)
  fastify.decorate("githubQueue", githubQueue)

  fastify.addHook("onClose", async () => {
    await stripeQueue.close()
    await githubQueue.close()
  })

  fastify.log.info("Stripe and GitHub event queues initialized")
}

export default fp(queuePlugin, { name: "event-queues", fastify: "5.x" })
