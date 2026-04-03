import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3"
import type {
  S3Config,
  PutObjectInput,
  GetObjectInput,
  DeleteObjectInput,
} from "./types.js"

function resolveConfig(
  config: S3Config = {}
): Required<Pick<S3Config, "region" | "forcePathStyle">> &
  Pick<S3Config, "endpoint" | "credentials"> {
  const endpoint = config.endpoint ?? process.env["S3_ENDPOINT"]
  return {
    region: config.region ?? process.env["AWS_REGION"] ?? "us-east-1",
    endpoint,
    // Force path-style when using a custom endpoint (LocalStack requirement)
    forcePathStyle: config.forcePathStyle ?? endpoint !== undefined,
    credentials: config.credentials ?? {
      accessKeyId: process.env["AWS_ACCESS_KEY_ID"] ?? "test",
      secretAccessKey: process.env["AWS_SECRET_ACCESS_KEY"] ?? "test",
    },
  }
}

/**
 * Creates a configured S3Client instance.
 *
 * When S3_ENDPOINT is set (e.g. http://localhost:4566 for LocalStack),
 * path-style addressing and dummy credentials are applied automatically.
 */
export function createS3Client(config?: S3Config): S3Client {
  const resolved = resolveConfig(config)
  return new S3Client({
    region: resolved.region,
    endpoint: resolved.endpoint,
    forcePathStyle: resolved.forcePathStyle,
    credentials: resolved.credentials,
  })
}

let instance: S3Client | null = null

/**
 * Returns the singleton S3 client. Creates it on first call.
 */
export function getS3Client(config?: S3Config): S3Client {
  if (instance === null) {
    instance = createS3Client(config)
  }
  return instance
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

export async function putObject(
  input: PutObjectInput,
  client?: S3Client
): Promise<void> {
  const s3 = client ?? getS3Client()
  await s3.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata,
    })
  )
}

export async function getObject(
  input: GetObjectInput,
  client?: S3Client
): Promise<Uint8Array> {
  const s3 = client ?? getS3Client()
  const result = await s3.send(
    new GetObjectCommand({ Bucket: input.bucket, Key: input.key })
  )
  if (result.Body == null) {
    throw new Error(`Object not found: s3://${input.bucket}/${input.key}`)
  }
  return result.Body.transformToByteArray()
}

export async function deleteObject(
  input: DeleteObjectInput,
  client?: S3Client
): Promise<void> {
  const s3 = client ?? getS3Client()
  await s3.send(
    new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key })
  )
}

export async function objectExists(
  input: GetObjectInput,
  client?: S3Client
): Promise<boolean> {
  const s3 = client ?? getS3Client()
  try {
    await s3.send(
      new HeadObjectCommand({ Bucket: input.bucket, Key: input.key })
    )
    return true
  } catch {
    return false
  }
}

export async function ensureBucketExists(
  bucket: string,
  client?: S3Client
): Promise<void> {
  const s3 = client ?? getS3Client()
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  }
}
