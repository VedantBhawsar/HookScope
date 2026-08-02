"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LoaderCircle, X } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
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
import {
  useUpdateEndpointMutation,
  type EndpointDetailRecord,
} from "@/hooks/use-endpoints"
import { getRequestErrorMessage } from "@/lib/http"

const verificationModes = ["NONE", "OPTIONAL", "STRICT"] as const

const customHeaderSchema = z.object({
  key: z.string().min(1, "Header name is required"),
  value: z.string().min(1, "Header value is required"),
})

const endpointSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  destinationUrl: z.string().url("Destination URL must be a valid URL"),
  verificationMode: z.enum(verificationModes),
  signingSecret: z.string().default(""),
  signatureHeader: z.string().default(""),
  signatureType: z.string().default(""),
  timestampHeader: z.string().default(""),
  toleranceSec: z
    .string()
    .default("")
    .refine((value) => value === "" || /^\d+$/.test(value), "Tolerance must be a non-negative integer"),
  customHeaders: z.array(customHeaderSchema).default([]),
})

type EndpointSettingsFormValues = {
  name: string
  destinationUrl: string
  verificationMode: (typeof verificationModes)[number]
  signingSecret: string
  signatureHeader: string
  signatureType: string
  timestampHeader: string
  toleranceSec: string
  customHeaders: Array<{ key: string; value: string }>
}

interface EndpointSettingsFormProps {
  projectId: string
  endpoint: EndpointDetailRecord
}

function toDefaultValues(endpoint: EndpointDetailRecord): EndpointSettingsFormValues {
  const customHeaders = endpoint.customHeaders
    ? Object.entries(endpoint.customHeaders).map(([key, value]) => ({ key, value: String(value) }))
    : []

  return {
    name: endpoint.name,
    destinationUrl: endpoint.destinationUrl,
    verificationMode: endpoint.verificationMode as (typeof verificationModes)[number],
    signingSecret: endpoint.signingSecret ?? "",
    signatureHeader: endpoint.signatureHeader ?? "",
    signatureType: endpoint.signatureType ?? "",
    timestampHeader: endpoint.timestampHeader ?? "",
    toleranceSec: endpoint.toleranceSec != null ? String(endpoint.toleranceSec) : "",
    customHeaders,
  }
}

export function EndpointSettingsForm({ projectId, endpoint }: EndpointSettingsFormProps) {
  const updateEndpointMutation = useUpdateEndpointMutation()

  const form = useForm<EndpointSettingsFormValues>({
    resolver: zodResolver(endpointSettingsSchema) as any,
    defaultValues: toDefaultValues(endpoint),
  })

  React.useEffect(() => {
    form.reset(toDefaultValues(endpoint))
  }, [endpoint, form])

  const verificationMode = form.watch("verificationMode")

  const onSubmit = async (values: EndpointSettingsFormValues) => {
    try {
      const customHeaders = values.customHeaders?.length
        ? Object.fromEntries(values.customHeaders.map((h) => [h.key.trim(), h.value.trim()]))
        : undefined

      const result = await updateEndpointMutation.mutateAsync({
        projectId,
        endpointId: endpoint.id,
        name: values.name.trim(),
        destinationUrl: values.destinationUrl.trim(),
        verificationMode: values.verificationMode,
        signingSecret: values.signingSecret?.trim() || undefined,
        signatureHeader: values.signatureHeader?.trim() || undefined,
        signatureType: values.signatureType?.trim() || undefined,
        timestampHeader: values.timestampHeader?.trim() || undefined,
        toleranceSec: values.toleranceSec === "" ? undefined : Number(values.toleranceSec),
        customHeaders,
      })

      toast.success(result.message)
      form.reset(toDefaultValues({ ...endpoint, ...result.endpoint }))
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Editable Settings</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint name</FormLabel>
                  <FormControl>
                    <Input placeholder="Payments Primary" {...field} />
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
                  <FormLabel>Verification mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Modes</SelectLabel>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="OPTIONAL">Optional</SelectItem>
                        <SelectItem value="STRICT">Strict</SelectItem>
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
                  <FormLabel>Destination URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/webhooks/receiver" {...field} />
                  </FormControl>
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
                    <Input placeholder="stripe-signature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timestampHeader"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timestamp header</FormLabel>
                  <FormControl>
                    <Input placeholder="stripe-timestamp" {...field} />
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
                    <Input placeholder="hmac-sha256" {...field} />
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

            {verificationMode === "STRICT" ? (
              <FormField
                control={form.control}
                name="signingSecret"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Signing secret</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter a new signing secret" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>

          {/* Custom Headers Section */}
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Custom Headers</p>
                <p className="text-xs text-muted-foreground">Add custom HTTP headers to be sent with webhook deliveries</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const current = form.getValues("customHeaders") || []
                  form.setValue("customHeaders", [...current, { key: "", value: "" }], { shouldDirty: true })
                }}
              >
                Add header
              </Button>
            </div>

            <div className="space-y-2">
              {(form.watch("customHeaders") || []).map((_, index) => (
                <div key={index} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`customHeaders.${index}.key`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Header name (e.g., X-Custom-Header)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`customHeaders.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Header value" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const current = form.getValues("customHeaders") || []
                      form.setValue(
                        "customHeaders",
                        current.filter((_, i) => i !== index),
                        { shouldDirty: true }
                      )
                    }}
                    className="h-9 px-2"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-border pt-6">
            <Button type="submit" size="sm" disabled={updateEndpointMutation.isPending || !form.formState.isDirty}>
              {updateEndpointMutation.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </Form>
    </section>
  )
}