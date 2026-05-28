import fp from "fastify-plugin"
import type { FastifyPluginAsync } from "fastify"
import { getS3Client, ensureBucketExists } from "@hookscope/s3"
import type { S3Config } from "@hookscope/s3"
import type { S3Client } from "@aws-sdk/client-s3"

declare module "fastify" {
  interface FastifyInstance {
    s3: S3Client
  }
}

interface S3PluginOptions extends S3Config {
  bucket?: string
  createBucketIfMissing?: boolean
}

const s3Plugin: FastifyPluginAsync<S3PluginOptions> = async (fastify, opts) => {
  const { bucket, createBucketIfMissing = true, ...s3Config } = opts

  const client = getS3Client(s3Config)

  if (createBucketIfMissing && bucket != null) {
    await ensureBucketExists(bucket, client)
    fastify.log.info({ bucket }, "S3 bucket ready")
  }

  fastify.decorate("s3", client)

  fastify.addHook("onClose", () => {
    client.destroy()
  })

  fastify.log.info("S3 client initialized")
}

export default fp(s3Plugin, {
  name: "s3",
  fastify: "5.x",
})
