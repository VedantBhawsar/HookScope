import type { z } from "zod"

export interface EnvIssue {
  path: string
  message: string
}

export type EnvSource = Record<string, string | undefined>

export interface EnvReport<T = unknown> {
  app: string
  ok: boolean
  data: T | null
  issues: EnvIssue[]
  warnings: EnvIssue[]
}

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: EnvIssue[] }

/**
 * Parses a flat string record (process.env) against a Zod schema and
 * normalizes every failure into a flat list of issues. Unlike a plain
 * safeParse, callers get ALL missing/invalid variables in one go.
 */
export function validateEnv<T>(
  schema: z.ZodType<T>,
  source: EnvSource = process.env,
): ParseResult<T> {
  const result = schema.safeParse(source)
  if (result.success) {
    return { ok: true, data: result.data }
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
      message: issue.message,
    })),
  }
}

export function formatIssues(app: string, issues: EnvIssue[]): string {
  const lines = [
    `✖ Invalid environment for ${app}`,
    "  " + "─".repeat(56),
    ...issues.map((issue) => `  • ${issue.path}: ${issue.message}`),
    "",
    "  Add or fix these variables in your .env file",
    "  (see the generated .env.example for reference), then re-run.",
    "",
  ]
  return lines.join("\n")
}
