"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
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
import {
  useUpdateEndpointMutation,
  type EndpointDetailRecord,
} from "@/hooks/use-endpoints"
import { getRequestErrorMessage } from "@/lib/http"

const verificationModes = ["NONE", "OPTIONAL", "STRICT"] as const

const endpointSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  destinationUrl: z.string().url("Destination URL must be a valid URL"),
  verificationMode: z.enum(verificationModes),
  signingSecret: z.string().optional(),
  signatureHeader: z.string().optional(),
  signatureType: z.string().optional(),
  timestampHeader: z.string().optional(),
  toleranceSec: z
    .string()
    .refine((value) => value === "" || /^\d+$/.test(value), "Tolerance must be a non-negative integer"),
})

type EndpointSettingsFormValues = z.infer<typeof endpointSettingsSchema>

interface EndpointSettingsFormProps {
  projectId: string
  endpoint: EndpointDetailRecord
}

function toDefaultValues(endpoint: EndpointDetailRecord): EndpointSettingsFormValues {
  return {
    name: endpoint.name,
    destinationUrl: endpoint.destinationUrl,
    verificationMode: endpoint.verificationMode as (typeof verificationModes)[number],
    signingSecret: endpoint.signingSecret ?? "",
    signatureHeader: endpoint.signatureHeader ?? "",
    signatureType: endpoint.signatureType ?? "",
    timestampHeader: endpoint.timestampHeader ?? "",
    toleranceSec: endpoint.toleranceSec != null ? String(endpoint.toleranceSec) : "",
  }
}

export function EndpointSettingsForm({ projectId, endpoint }: EndpointSettingsFormProps) {
  const updateEndpointMutation = useUpdateEndpointMutation()

  const form = useForm<EndpointSettingsFormValues>({
    resolver: zodResolver(endpointSettingsSchema),
    defaultValues: toDefaultValues(endpoint),
  })

  React.useEffect(() => {
    form.reset(toDefaultValues(endpoint))
  }, [endpoint, form])

  const verificationMode = form.watch("verificationMode")

  const onSubmit = async (values: EndpointSettingsFormValues) => {
    try {
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
      })

      toast.success(result.message)
      form.reset(toDefaultValues({ ...endpoint, ...result.endpoint }))
    } catch (error) {
      toast.error(getRequestErrorMessage(error))
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
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

          <div className="flex justify-end">
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