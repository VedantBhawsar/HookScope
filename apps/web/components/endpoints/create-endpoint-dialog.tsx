"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { LoaderCircle, Zap, CheckCircle2 } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hookscope/ui/components/dialog"
import { Progress } from "@hookscope/ui/components/progress"
import { Separator } from "@hookscope/ui/components/separator"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hookscope/ui/components/form"
import { Input } from "@hookscope/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@hookscope/ui/components/select"
import { toast } from "@hookscope/ui/components/sonner"
import { Textarea } from "@hookscope/ui/components/textarea"
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
  const { usage, isAtEndpointLimit, openUpgradeDialog } = usePricing()
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

  if (isAtEndpointLimit) {
    const used = usage?.endpoints.used ?? 0
    const limit = usage?.endpoints.limit ?? 0

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center gap-3 pb-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
              <Zap className="size-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg">Endpoint limit reached</DialogTitle>
              <DialogDescription>
                You&apos;ve used all {limit} endpoint{limit !== 1 ? "s" : ""} on your current plan.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 ">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Endpoints used</span>
                <span className="font-semibold tabular-nums text-destructive">
                  {used} / {limit}
                </span>
              </div>
              <Progress value={100} className="h-2 [&>div]:bg-destructive" />
            </div>

            <Separator />

            <div className="space-y-2.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Unlock more with an upgrade
              </p>
              {[
                { plan: "Developer", endpoints: "10 endpoints" },
                { plan: "Pro", endpoints: "50 endpoints" },
                { plan: "Enterprise", endpoints: "Unlimited endpoints" },
              ].map(({ plan, endpoints }) => (
                <div key={plan} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  <span className="font-medium">{plan}</span>
                  <span className="text-muted-foreground">— {endpoints}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="gap-2 w-1/2"
              onClick={() => {
                onOpenChange(false)
                openUpgradeDialog(
                  `You've reached your ${limit}-endpoint limit. Upgrade to add more endpoints.`,
                  usage?.plan.tier,
                )
              }}
            >
              <Zap className="size-4" />
              Upgrade plan
            </Button>
            <Button variant="outline" className="w-1/2" onClick={() => onOpenChange(false)}>
              Maybe later
            </Button>
          </div>
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
