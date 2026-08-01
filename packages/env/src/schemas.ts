import { z } from "zod"

// ─── Primitive helpers ──────────────────────────────────────────────────────

const nodeEnv = z.enum(["development", "test", "production"])
const logLevel = z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])

/** A non-empty trimmed string with a human-friendly "required" error. */
const requiredString = (name: string, min = 1) =>
  z
    .string({ error: `${name} is required` })
    .trim()
    .min(min, `${name} must be at least ${min} characters`)

/** A non-empty URL string (postgres://, redis://, http(s)://, …). */
const url = (name: string) =>
  requiredString(name).refine(
    (value) => {
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    `${name} must be a valid URL`,
  )

const secret = (name: string, min = 8) => requiredString(name, min)

/** Boolean stored as a string ("true"/"false"). */
const boolString = z
  .union([z.literal("true"), z.literal("false")])
  .default("false")
  .transform((value) => value === "true")

const optionalString = (name: string) =>
  z.string().optional().default("").describe(`${name} (optional)`)

const optionalUrl = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .trim()
    .optional()
    .default("")
    .refine(
      (value) =>
        value === "" ||
        (() => {
          try {
            new URL(value)
            return true
          } catch {
            return false
          }
        })(),
      `${name} must be a valid URL`,
    )

// ─── Shared blocks ──────────────────────────────────────────────────────────

const sharedBase = {
  NODE_ENV: nodeEnv.default("development"),
  DATABASE_URL: url("DATABASE_URL"),
  REDIS_URL: url("REDIS_URL"),
}

const s3Block = {
  S3_ENDPOINT: url("S3_ENDPOINT"),
  S3_BUCKET: requiredString("S3_BUCKET"),
  AWS_REGION: requiredString("AWS_REGION"),
  AWS_ACCESS_KEY_ID: requiredString("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: requiredString("AWS_SECRET_ACCESS_KEY"),
}

// ─── API ────────────────────────────────────────────────────────────────────

export const apiEnvSchema = z.object({
  ...sharedBase,
  PORT: z.coerce.number().int().positive().default(5000),

  JWT_ACCESS_SECRET: secret("JWT_ACCESS_SECRET", 32),
  MAINTENANCE_SECRET: secret("MAINTENANCE_SECRET", 8),
  API_BASE_URL: url("API_BASE_URL"),
  FRONTEND_URL: url("FRONTEND_URL"),
  INGESTION_BASE_URL: url("INGESTION_BASE_URL"),
  COOKIE_DOMAIN: optionalString("COOKIE_DOMAIN"),

  APP_NAME: requiredString("APP_NAME").default("HookScope"),

  GOOGLE_CLIENT_ID: optionalString("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optionalString("GOOGLE_CLIENT_SECRET"),
  GITHUB_CLIENT_ID: optionalString("GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: optionalString("GITHUB_CLIENT_SECRET"),

  SMTP_HOST: requiredString("SMTP_HOST").default("smtp.ethereal.email"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: boolString,
  SMTP_USER: optionalString("SMTP_USER"),
  SMTP_PASS: optionalString("SMTP_PASS"),
  SMTP_FROM: requiredString("SMTP_FROM").default("noreply@hookscope.dev"),

  DODO_PAYMENTS_API_KEY: optionalString("DODO_PAYMENTS_API_KEY"),
  DODO_PAYMENTS_WEBHOOK_KEY: optionalString("DODO_PAYMENTS_WEBHOOK_KEY"),
  DODO_STARTER_MONTHLY_PRODUCT_ID: optionalString("DODO_STARTER_MONTHLY_PRODUCT_ID"),
  DODO_STARTER_ANNUAL_PRODUCT_ID: optionalString("DODO_STARTER_ANNUAL_PRODUCT_ID"),
  DODO_PRO_MONTHLY_PRODUCT_ID: optionalString("DODO_PRO_MONTHLY_PRODUCT_ID"),
  DODO_PRO_ANNUAL_PRODUCT_ID: optionalString("DODO_PRO_ANNUAL_PRODUCT_ID"),
})

export type ApiEnv = z.infer<typeof apiEnvSchema>

// ─── Ingestion ──────────────────────────────────────────────────────────────

export const ingestionEnvSchema = z.object({
  ...sharedBase,
  PORT: z.coerce.number().int().positive().default(5001),
  HOST: z.string().min(1).default("0.0.0.0"),
  LOG_LEVEL: logLevel.default("info"),
  ...s3Block,
})

export type IngestionEnv = z.infer<typeof ingestionEnvSchema>

// ─── Web (Next.js) ──────────────────────────────────────────────────────────

export const webEnvSchema = z.object({
  NODE_ENV: nodeEnv.default("development"),
  NEXT_PUBLIC_API_URL: url("NEXT_PUBLIC_API_URL"),
  NEXT_PUBLIC_APP_URL: optionalUrl("NEXT_PUBLIC_APP_URL"),
  NEXT_PUBLIC_SITE_URL: optionalUrl("NEXT_PUBLIC_SITE_URL"),
  NEXT_PUBLIC_INGESTION_URL: optionalUrl("NEXT_PUBLIC_INGESTION_URL"),
})

export type WebEnv = z.infer<typeof webEnvSchema>

// ─── DB package ─────────────────────────────────────────────────────────────

export const dbEnvSchema = z.object({
  NODE_ENV: nodeEnv.default("development"),
  DATABASE_URL: url("DATABASE_URL"),
})

export type DbEnv = z.infer<typeof dbEnvSchema>
