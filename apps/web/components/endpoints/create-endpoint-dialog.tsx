"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { Textarea } from "@workspace/ui/components/textarea"
import { getRequestErrorMessage } from "@/lib/http"
import {
  useCreateEndpointMutation,
  type CreateEndpointPayload,
  type EndpointCreatedRecord,
  type EndpointStatus,
  type EndpointVerificationMode,
} from "@/hooks/use-endpoints"
import { setActiveEndpointForProject } from "@/lib/endpoint-selection"
import { usePricing } from "@/components/providers/pricing-provider"

const SOURCE_OPTIONS = [
  { label: "Stripe", value: "STRIPE" },
  { label: "GitHub", value: "GITHUB" },
  { label: "Shopify", value: "SHOPIFY" },
  { label: "Slack", value: "SLACK" },
  { label: "Twilio", value: "TWILIO" },
  { label: "Generic", value: "GENERIC" },
] as const

const VERIFICATION_MODE_OPTIONS = [
  { label: "None", value: "NONE" },
  { label: "Optional", value: "OPTIONAL" },
  { label: "Strict", value: "STRICT" },
] as const

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
] as const

const sourceValues = ["STRIPE", "GITHUB", "SHOPIFY", "SLACK", "TWILIO", "GENERIC"] as const
const verificationModeValues = ["NONE", "OPTIONAL", "STRICT"] as const
const statusValues = ["active", "paused"] as const

const SOURCE_FIELD_CONFIG: Record<
  (typeof sourceValues)[number],
  {
    signatureHeaderDefault: string
    signatureTypeDefault: string
    timestampHeaderDefault: string
    showTimestampFields: boolean
  }
> = {
  STRIPE: {
    signatureHeaderDefault: "stripe-signature",
    signatureTypeDefault: "hmac-sha256",
    timestampHeaderDefault: "stripe-timestamp",
    showTimestampFields: true,
  },
  GITHUB: {
    signatureHeaderDefault: "x-hub-signature-256",
    signatureTypeDefault: "hmac-sha256",
    timestampHeaderDefault: "",
    showTimestampFields: false,
  },
  SHOPIFY: {
    signatureHeaderDefault: "x-shopify-hmac-sha256",
    signatureTypeDefault: "hmac-sha256",
    timestampHeaderDefault: "",
    showTimestampFields: false,
  },
  SLACK: {
    signatureHeaderDefault: "x-slack-signature",
    signatureTypeDefault: "hmac-sha256",
    timestampHeaderDefault: "x-slack-request-timestamp",
    showTimestampFields: true,
  },
  TWILIO: {
    signatureHeaderDefault: "x-twilio-signature",
    signatureTypeDefault: "hmac-sha1",
    timestampHeaderDefault: "",
    showTimestampFields: false,
  },
  GENERIC: {
    signatureHeaderDefault: "",
    signatureTypeDefault: "hmac-sha256",
    timestampHeaderDefault: "",
    showTimestampFields: true,
  },
}

const createEndpointSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    source: z.enum(sourceValues),
    destinationUrl: z.string().trim().url("Destination URL must be a valid URL"),
    verificationMode: z.enum(verificationModeValues),
    signingSecret: z.string().optional(),
    signatureHeader: z.string().optional(),
    signatureType: z.string().optional(),
    timestampHeader: z.string().optional(),
    toleranceSec: z
      .string()
      .refine((value) => value === "" || /^\d+$/.test(value), "Tolerance must be a non-negative integer"),
    eventFilters: z
      .string()
      .refine((value) => {
        if (!value.trim()) return true

        try {
          JSON.parse(value)
          return true
        } catch {
          return false
        }
      }, "Event filters must be valid JSON"),
    status: z.enum(statusValues),
  })

type CreateEndpointFormValues = z.infer<typeof createEndpointSchema>

const defaultValues: CreateEndpointFormValues = {
  name: "",
  source: "GENERIC",
  destinationUrl: "",
  verificationMode: "NONE",
  signingSecret: "",
  signatureHeader: "",
  signatureType: "",
  timestampHeader: "",
  toleranceSec: "",
  eventFilters: "",
  status: "active",
}

interface CreateEndpointDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
  projectName?: string
  /** Called after a successful endpoint creation, before the dialog closes. */
  onCreated?: () => void
}

export function CreateEndpointDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onCreated,
}: CreateEndpointDialogProps) {
  const createEndpointMutation = useCreateEndpointMutation()
  const { isAtEndpointLimit, openUpgradeDialog } = usePricing()
  const [createdEndpoint, setCreatedEndpoint] = React.useState<EndpointCreatedRecord | null>(null)
  const form = useForm<CreateEndpointFormValues>({
    defaultValues,
  })

  const previousOpenRef = React.useRef(open)

  React.useEffect(() => {
    const wasOpen = previousOpenRef.current

    if (wasOpen && !open) {
      form.reset(defaultValues)
      setCreatedEndpoint(null)
      createEndpointMutation.reset()
    }

    previousOpenRef.current = open
  }, [open, form, createEndpointMutation])

  const verificationMode = form.watch("verificationMode")
  const selectedSource = form.watch("source")
  const previousSourceRef = React.useRef(defaultValues.source)

  const isProviderLocked = selectedSource !== "GENERIC"

  React.useEffect(() => {
    const previousSource = previousSourceRef.current
    if (previousSource === selectedSource) return

    const config = SOURCE_FIELD_CONFIG[selectedSource]
    const isLocked = selectedSource !== "GENERIC"

    if (isLocked) {
      // Always overwrite with provider defaults when a specific provider is selected
      form.setValue("signatureHeader", config.signatureHeaderDefault)
      form.setValue("signatureType", config.signatureTypeDefault)
    } else {
      // Switching to GENERIC — clear provider-set values so user can fill freely
      form.setValue("signatureHeader", "")
      form.setValue("signatureType", "")
    }

    if (config.showTimestampFields) {
      form.setValue("timestampHeader", isLocked ? config.timestampHeaderDefault : "")
      const currentTolerance = form.getValues().toleranceSec
      if (!currentTolerance?.trim()) {
        form.setValue("toleranceSec", "300")
      }
    } else {
      form.setValue("timestampHeader", "")
      form.setValue("toleranceSec", "")
    }

    previousSourceRef.current = selectedSource
  }, [selectedSource, form])

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }

  const onSubmit = async (values: CreateEndpointFormValues) => {
    if (!projectId) return

    form.clearErrors()

    const parsed = createEndpointSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0]
        if (typeof fieldName === "string") {
          form.setError(fieldName as keyof CreateEndpointFormValues, {
            type: "manual",
            message: issue.message,
          })
        }
      }
      return
    }

    if (values.verificationMode === "STRICT" && !values.signingSecret?.trim()) {
      form.setError("signingSecret", {
        type: "manual",
        message: "Signing secret is required in strict mode",
      })
      return
    }

    const payload: CreateEndpointPayload = {
      projectId,
      name: values.name.trim(),
      source: values.source,
      destinationUrl: values.destinationUrl.trim(),
      verificationMode: values.verificationMode as EndpointVerificationMode,
      signingSecret: values.signingSecret?.trim() || undefined,
      signatureHeader: values.signatureHeader?.trim() || undefined,
      signatureType: values.signatureType?.trim() || undefined,
      timestampHeader: values.timestampHeader?.trim() || undefined,
      toleranceSec: values.toleranceSec === "" ? undefined : Number(values.toleranceSec),
      status: values.status as EndpointStatus,
    }

    const normalizedEventFilters = values.eventFilters.trim()
    if (normalizedEventFilters) {
      payload.eventFilters = JSON.parse(normalizedEventFilters)
    }

    try {
      const { endpoint, message } = await createEndpointMutation.mutateAsync(payload)

      setActiveEndpointForProject(projectId, {
        id: endpoint.id,
        name: endpoint.name,
      })

      toast.success(message)
      onCreated?.()
      setCreatedEndpoint(endpoint)
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  // When the user is at their endpoint limit, show an upgrade prompt instead of the form.
  // TODO: Implement what to display here (5–10 lines).
  // Hint: use `openUpgradeDialog(reason)` to open the pricing modal, then close this dialog.
  // Consider: a short message ("You've reached your X-endpoint limit"), an Upgrade button,
  // and a Cancel/close button. Access `usage.endpoints` for exact counts.
  if (isAtEndpointLimit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endpoint Limit Reached</DialogTitle>
          </DialogHeader>
          {/* ── YOUR CODE GOES HERE ────────────────────────────────── */}
          {/* Implement the limit-reached state. You have access to:    */}
          {/*   openUpgradeDialog(reason?: string)                      */}
          {/*   onOpenChange(false) to close this dialog                */}
          {/* ────────────────────────────────────────────────────────── */}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{createdEndpoint ? "Endpoint Created" : "Create Endpoint"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {createdEndpoint
              ? "Save this ingestion URL in your provider webhook settings."
              : projectName
                ? `Project: ${projectName}`
                : "Select a project before creating an endpoint."}
          </p>
        </DialogHeader>

        {createdEndpoint ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ingestion URL</label>
              <div className="flex items-center gap-2">
                <Input readOnly value={createdEndpoint.webhookUrl} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopy(createdEndpoint.webhookUrl, "Ingestion URL")}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Endpoint token</label>
              <div className="flex items-center gap-2">
                <Input readOnly value={createdEndpoint.token} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopy(createdEndpoint.token, "Endpoint token")}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This token is shown once. Store it securely.
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form id="create-endpoint-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Endpoint name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input autoFocus placeholder="Payments Primary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Source <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger aria-label="Select endpoint source" className="w-full">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        <SelectGroup>
                          <SelectLabel>Providers</SelectLabel>
                          {SOURCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationUrl"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>
                      Destination URL <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/webhooks/receiver" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="verificationMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Verification mode <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger  className="w-full">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Modes</SelectLabel>
                          {VERIFICATION_MODE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Status <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger  className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>States</SelectLabel>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signatureHeader"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature header</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={SOURCE_FIELD_CONFIG[selectedSource].signatureHeaderDefault || "x-signature"}
                        disabled={isProviderLocked}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signatureType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature type</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={SOURCE_FIELD_CONFIG[selectedSource].signatureTypeDefault}
                        disabled={isProviderLocked}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {SOURCE_FIELD_CONFIG[selectedSource].showTimestampFields ? (
                <>
                  <FormField
                    control={form.control}
                    name="timestampHeader"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timestamp header</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={SOURCE_FIELD_CONFIG[selectedSource].timestampHeaderDefault || "x-timestamp"}
                            disabled={isProviderLocked}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toleranceSec"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tolerance (seconds)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} placeholder="300" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              {verificationMode === "STRICT" ? (
                <FormField
                  control={form.control}
                  name="signingSecret"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel>
                        Signing secret <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter signing secret" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="eventFilters"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Event filters JSON</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder='e.g. {"allow":["payment_intent.succeeded"]}'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </form>
          </Form>
        )}

        <DialogFooter>
          {createdEndpoint ? (
            <>
              <Button type="button" variant="outline" onClick={() => setCreatedEndpoint(null)}>
                Create Another
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-endpoint-form"
                disabled={createEndpointMutation.isPending || !projectId}
              >
                {createEndpointMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {createEndpointMutation.isPending ? "Creating…" : "Create Endpoint"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
