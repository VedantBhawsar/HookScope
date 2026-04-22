import { z } from "zod"

const alertTypeSchema = z.enum([
  "DELIVERY_FAILURE_RATE",
  "DELIVERY_ERROR_CODE",
  "EVENT_FAILED",
  "ENDPOINT_SILENCE",
])

const deliveryFailureRateConfigSchema = z.object({
  threshold: z.number().min(1, "Threshold must be at least 1").max(100, "Threshold cannot exceed 100"),
  windowMinutes: z.number().min(1, "Window must be at least 1 minute"),
})

const deliveryErrorCodeConfigSchema = z.object({
  errorCode: z.enum([
    "SIGNATURE_INVALID",
    "RATE_LIMITED",
    "DESTINATION_UNREACHABLE",
    "TIMEOUT",
    "PAYLOAD_TOO_LARGE",
    "PROCESSING_ERROR",
  ]),
})

const eventFailedConfigSchema = z.object({
  statuses: z.array(z.enum(["FAILED", "DEAD_LETTER"])).min(1, "Pick at least one status"),
})

const endpointSilenceConfigSchema = z.object({
  windowMinutes: z.number().min(1, "Window must be at least 1 minute"),
})

export const alertFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    type: alertTypeSchema,
    severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
    endpointId: z.string().trim().min(1).nullable().optional(),
    config: z.record(z.string(), z.unknown()),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const config = values.config

    const result =
      values.type === "DELIVERY_FAILURE_RATE"
        ? deliveryFailureRateConfigSchema.safeParse(config)
        : values.type === "DELIVERY_ERROR_CODE"
          ? deliveryErrorCodeConfigSchema.safeParse(config)
          : values.type === "EVENT_FAILED"
            ? eventFailedConfigSchema.safeParse(config)
            : endpointSilenceConfigSchema.safeParse(config)

    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["config", ...issue.path],
          message: issue.message,
        })
      }
    }
  })

export type AlertFormValues = z.infer<typeof alertFormSchema>

export const alertFormConfigDefaults: Record<z.infer<typeof alertTypeSchema>, Record<string, unknown>> = {
  DELIVERY_FAILURE_RATE: { threshold: 50, windowMinutes: 10 },
  DELIVERY_ERROR_CODE: { errorCode: "SIGNATURE_INVALID" },
  EVENT_FAILED: { statuses: ["FAILED"] },
  ENDPOINT_SILENCE: { windowMinutes: 30 },
}
