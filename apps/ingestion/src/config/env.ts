/**
 * Environment configuration for the ingestion server.
 * All values are read once at startup and validated.
 */
export interface Env {
  NODE_ENV: "development" | "production" | "test"
  PORT: number
  HOST: string
  LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace"
  // Redis
  REDIS_URL: string
  // S3 / LocalStack
  S3_ENDPOINT: string
  S3_BUCKET: string
  AWS_REGION: string
  AWS_ACCESS_KEY_ID: string
  AWS_SECRET_ACCESS_KEY: string
}

function required(key: string): string {
  const value = process.env[key]
  if (value == null || value === "") {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw == null) return fallback
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${key} must be an integer, got: ${raw}`
    )
  }
  return parsed
}

export function loadEnv(): Env {
  const nodeEnv = optional("NODE_ENV", "development")
  if (
    nodeEnv !== "development" &&
    nodeEnv !== "production" &&
    nodeEnv !== "test"
  ) {
    throw new Error(
      `NODE_ENV must be one of development | production | test, got: ${nodeEnv}`
    )
  }

  const logLevel = optional("LOG_LEVEL", "info")
  if (
    !["fatal", "error", "warn", "info", "debug", "trace"].includes(logLevel)
  ) {
    throw new Error(`Invalid LOG_LEVEL: ${logLevel}`)
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: optionalInt("PORT", 3001),
    HOST: optional("HOST", "0.0.0.0"),
    LOG_LEVEL: logLevel as Env["LOG_LEVEL"],
    REDIS_URL: optional("REDIS_URL", "redis://localhost:6379"),
    S3_ENDPOINT: optional("S3_ENDPOINT", "http://localhost:4566"),
    S3_BUCKET: optional("S3_BUCKET", "webhooks"),
    AWS_REGION: optional("AWS_REGION", "us-east-1"),
    AWS_ACCESS_KEY_ID: optional("AWS_ACCESS_KEY_ID", "test"),
    AWS_SECRET_ACCESS_KEY: optional("AWS_SECRET_ACCESS_KEY", "test"),
  }
}
