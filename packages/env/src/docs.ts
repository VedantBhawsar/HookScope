/**
 * Human-readable documentation for every environment variable.
 *
 * This is the single source of truth used to render the `.env.example`
 * templates (run `bun run check:env generate`) — keep it in sync with the
 * schemas in `./schemas.ts`.
 */

export interface EnvVarDoc {
  key: string
  section: string
  description: string
  /** Omit (or set false) for optional variables — they still get validated when present. */
  required?: boolean
  example?: string
  /** Secrets are emitted as empty values (KEY=) so no real keys leak into examples. */
  secret?: boolean
}

export const apiEnvDocs: EnvVarDoc[] = [
  { key: "NODE_ENV", section: "Server", description: "Runtime environment", example: "development" },
  { key: "PORT", section: "Server", description: "API server port", example: "5000" },
  {
    key: "DATABASE_URL",
    section: "Database",
    description: "Postgres connection string",
    required: true,
    example: "postgresql://postgres:postgres@localhost:5432/webhook_db",
  },
  {
    key: "REDIS_URL",
    section: "Redis",
    description: "Redis connection string",
    required: true,
    example: "redis://localhost:6379",
  },
  {
    key: "JWT_ACCESS_SECRET",
    section: "Auth",
    description: "Secret used to sign access tokens (openssl rand -hex 32)",
    required: true,
    secret: true,
  },
  {
    key: "MAINTENANCE_SECRET",
    section: "Maintenance",
    description: "Secret for maintenance endpoints (openssl rand -hex 32)",
    required: true,
    secret: true,
  },
  {
    key: "API_BASE_URL",
    section: "URLs",
    description: "Public base URL of this API (used for OAuth callbacks)",
    required: true,
    example: "http://localhost:5000",
  },
  {
    key: "FRONTEND_URL",
    section: "URLs",
    description: "Public URL of the web dashboard (CORS + redirects)",
    required: true,
    example: "http://localhost:3000",
  },
  {
    key: "INGESTION_BASE_URL",
    section: "URLs",
    description: "Base URL of the ingestion server",
    required: true,
    example: "http://localhost:5001",
  },
  {
    key: "COOKIE_DOMAIN",
    section: "URLs",
    description: "Cookie domain for auth cookies (.yourdomain.com in prod, unset in dev)",
    example: ".yourdomain.com",
  },
  { key: "APP_NAME", section: "App", description: "Brand name used in emails", example: "HookScope" },
  {
    key: "GOOGLE_CLIENT_ID",
    section: "OAuth — Google",
    description: "Google OAuth client ID (empty disables Google sign-in)",
    example: "google-client-id.apps.googleusercontent.com",
  },
  {
    key: "GOOGLE_CLIENT_SECRET",
    section: "OAuth — Google",
    description: "Google OAuth client secret",
    secret: true,
  },
  {
    key: "GITHUB_CLIENT_ID",
    section: "OAuth — GitHub",
    description: "GitHub OAuth client ID (empty disables GitHub sign-in)",
    example: "Ov23liEXAMPLE",
  },
  {
    key: "GITHUB_CLIENT_SECRET",
    section: "OAuth — GitHub",
    description: "GitHub OAuth client secret",
    secret: true,
  },
  {
    key: "SMTP_HOST",
    section: "Email (SMTP)",
    description: "SMTP host for transactional email",
    example: "smtp.ethereal.email",
  },
  { key: "SMTP_PORT", section: "Email (SMTP)", description: "SMTP port", example: "587" },
  { key: "SMTP_SECURE", section: "Email (SMTP)", description: "Use TLS for SMTP (true/false)", example: "false" },
  { key: "SMTP_USER", section: "Email (SMTP)", description: "SMTP username", secret: true },
  { key: "SMTP_PASS", section: "Email (SMTP)", description: "SMTP password", secret: true },
  { key: "SMTP_FROM", section: "Email (SMTP)", description: "From address for outgoing email", example: "noreply@hookscope.dev" },
  {
    key: "DODO_PAYMENTS_API_KEY",
    section: "Dodo Payments",
    description: "Dodo Payments API key",
    secret: true,
  },
  {
    key: "DODO_PAYMENTS_WEBHOOK_KEY",
    section: "Dodo Payments",
    description: "Dodo Payments webhook signing key",
    secret: true,
  },
  {
    key: "DODO_STARTER_MONTHLY_PRODUCT_ID",
    section: "Dodo Payments",
    description: "Dodo product ID for Starter (monthly)",
    example: "product_xxxxxxxxxxxxxxxx",
  },
  {
    key: "DODO_STARTER_ANNUAL_PRODUCT_ID",
    section: "Dodo Payments",
    description: "Dodo product ID for Starter (annual)",
    example: "product_xxxxxxxxxxxxxxxx",
  },
  {
    key: "DODO_PRO_MONTHLY_PRODUCT_ID",
    section: "Dodo Payments",
    description: "Dodo product ID for Pro (monthly)",
    example: "product_xxxxxxxxxxxxxxxx",
  },
  {
    key: "DODO_PRO_ANNUAL_PRODUCT_ID",
    section: "Dodo Payments",
    description: "Dodo product ID for Pro (annual)",
    example: "product_xxxxxxxxxxxxxxxx",
  },
]

export const ingestionEnvDocs: EnvVarDoc[] = [
  { key: "NODE_ENV", section: "Server", description: "Runtime environment", example: "development" },
  { key: "PORT", section: "Server", description: "Ingestion server port", example: "5001" },
  { key: "HOST", section: "Server", description: "Bind address", example: "0.0.0.0" },
  { key: "LOG_LEVEL", section: "Server", description: "Pino log level", example: "info" },
  {
    key: "DATABASE_URL",
    section: "Database",
    description: "Postgres connection string",
    required: true,
    example: "postgresql://postgres:postgres@localhost:5432/webhook_db",
  },
  {
    key: "REDIS_URL",
    section: "Redis",
    description: "Redis connection string (used for queues + cache)",
    required: true,
    example: "redis://localhost:6379",
  },
  {
    key: "S3_ENDPOINT",
    section: "S3",
    description: "S3-compatible endpoint (MinIO/LocalStack)",
    required: true,
    example: "http://localhost:4566",
  },
  { key: "S3_BUCKET", section: "S3", description: "Bucket for stored webhook payloads", required: true, example: "webhooks" },
  { key: "AWS_REGION", section: "S3", description: "AWS region", required: true, example: "us-east-1" },
  { key: "AWS_ACCESS_KEY_ID", section: "S3", description: "S3 access key", required: true, example: "minioadmin" },
  { key: "AWS_SECRET_ACCESS_KEY", section: "S3", description: "S3 secret key", required: true, example: "minioadmin" },
]

export const webEnvDocs: EnvVarDoc[] = [
  { key: "NODE_ENV", section: "Server", description: "Runtime environment", example: "development" },
  {
    key: "NEXT_PUBLIC_API_URL",
    section: "API",
    description: "Public URL of the API server",
    required: true,
    example: "http://localhost:5000",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    section: "Site",
    description: "Public URL of this dashboard",
    example: "http://localhost:3000",
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    section: "Site",
    description: "Canonical site URL (metadata)",
    example: "http://localhost:3000",
  },
  {
    key: "NEXT_PUBLIC_INGESTION_URL",
    section: "Site",
    description: "Public URL of the ingestion server (CSP connect-src)",
    example: "http://localhost:5001",
  },
]

export const dbEnvDocs: EnvVarDoc[] = [
  { key: "NODE_ENV", section: "Server", description: "Runtime environment", example: "development" },
  {
    key: "DATABASE_URL",
    section: "Database",
    description: "Postgres connection string",
    required: true,
    example: "postgresql://postgres:postgres@localhost:5432/webhook_db",
  },
]
