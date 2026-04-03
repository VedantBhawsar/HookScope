export interface S3Config {
  /**
   * AWS region. Defaults to the AWS_REGION env var or "us-east-1".
   */
  region?: string

  /**
   * Custom endpoint for LocalStack or other S3-compatible services.
   * Defaults to the S3_ENDPOINT env var.
   */
  endpoint?: string

  /**
   * Force path-style URLs (required for LocalStack).
   * Defaults to true when endpoint is provided.
   */
  forcePathStyle?: boolean

  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

export interface PutObjectInput {
  bucket: string
  key: string
  body: Uint8Array | string
  contentType?: string
  metadata?: Record<string, string>
}

export interface GetObjectInput {
  bucket: string
  key: string
}

export interface DeleteObjectInput {
  bucket: string
  key: string
}
