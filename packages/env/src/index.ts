import type { z } from "zod"
import {
  apiEnvSchema,
  ingestionEnvSchema,
  webEnvSchema,
  dbEnvSchema,
  type ApiEnv,
  type IngestionEnv,
  type WebEnv,
  type DbEnv,
} from "./schemas"
import {
  validateEnv,
  formatIssues,
  type EnvIssue,
  type EnvReport,
  type EnvSource,
} from "./validate"
import {
  apiEnvDocs,
  ingestionEnvDocs,
  webEnvDocs,
  dbEnvDocs,
  type EnvVarDoc,
} from "./docs"

export type {
  ApiEnv,
  IngestionEnv,
  WebEnv,
  DbEnv,
  EnvIssue,
  EnvReport,
  EnvSource,
  EnvVarDoc,
}
export { apiEnvSchema, ingestionEnvSchema, webEnvSchema, dbEnvSchema }
export { validateEnv, formatIssues }
export { apiEnvDocs, ingestionEnvDocs, webEnvDocs, dbEnvDocs }

function evaluate<T>(
  app: string,
  schema: z.ZodType<T>,
  docs: EnvVarDoc[],
  source: EnvSource,
): EnvReport<T> {
  const parsed = validateEnv(schema, source)

  if (!parsed.ok) {
    return { app, ok: false, data: null, issues: parsed.issues, warnings: [] }
  }

  const data = parsed.data
  const warnings: EnvIssue[] = []

  // Optional-but-recommended variables are only called out in production,
  // where a missing value (OAuth, SMTP creds, billing keys) breaks a feature.
  const flat = data as unknown as Record<string, unknown>
  if (flat.NODE_ENV === "production") {
    for (const doc of docs) {
      if (doc.required) continue
      const value = flat[doc.key]
      if (value == null || value === "") {
        warnings.push({
          path: doc.key,
          message: `not configured — ${doc.description}`,
        })
      }
    }
  }

  return { app, ok: true, data, issues: [], warnings }
}

function createLoaders<T>(app: string, schema: z.ZodType<T>, docs: EnvVarDoc[]) {
  const load = (source: EnvSource = process.env): T => {
    const report = evaluate(app, schema, docs, source)
    for (const warning of report.warnings) {
      console.warn(`⚠ ${app}: ${warning.path} — ${warning.message}`)
    }
    if (!report.ok) {
      console.error(formatIssues(app, report.issues))
      throw new Error(
        `Cannot start ${app}: ${report.issues.length} missing/invalid environment variable(s).`,
      )
    }
    return report.data as T
  }

  const check = (source: EnvSource = process.env): EnvReport<T> =>
    evaluate(app, schema, docs, source)

  return { load, check }
}

const api = createLoaders("api", apiEnvSchema, apiEnvDocs)
const ingestion = createLoaders("ingestion", ingestionEnvSchema, ingestionEnvDocs)
const web = createLoaders("web", webEnvSchema, webEnvDocs)
const db = createLoaders("db", dbEnvSchema, dbEnvDocs)

/** Validates and returns the typed API env. Throws before the server boots if invalid. */
export const loadApiEnv = api.load
/** Validates and returns the typed ingestion env. Throws before the server boots if invalid. */
export const loadIngestionEnv = ingestion.load
/** Validates and returns the typed web env. Throws before the server boots if invalid. */
export const loadWebEnv = web.load
/** Validates and returns the typed DB env. Throws before the client initializes if invalid. */
export const loadDbEnv = db.load

/** Non-throwing check used by the CLI (`bun packages/env/scripts/check.ts <app>`). */
export const checkApiEnv = api.check
export const checkIngestionEnv = ingestion.check
export const checkWebEnv = web.check
export const checkDbEnv = db.check
