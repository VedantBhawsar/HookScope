"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { useAlertEndpointOptionsQuery } from "@/hooks/use-alerts"
import { alertFormConfigDefaults, type AlertFormValues } from "./alert-form-schema"

// ─── Alert Type Labels ────────────────────────────────────────────────────────

const ALERT_TYPE_OPTIONS = [
  { value: "DELIVERY_FAILURE_RATE", label: "Delivery Failure Rate" },
  { value: "DELIVERY_ERROR_CODE", label: "Delivery Error Code" },
  { value: "EVENT_FAILED", label: "Event Failed" },
  { value: "ENDPOINT_SILENCE", label: "Endpoint Silence" },
] as const

const ALERT_SEVERITY_OPTIONS = [
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
] as const

const DELIVERY_ERROR_CODE_OPTIONS = [
  { value: "SIGNATURE_INVALID", label: "Signature Invalid" },
  { value: "RATE_LIMITED", label: "Rate Limited" },
  { value: "DESTINATION_UNREACHABLE", label: "Destination Unreachable" },
  { value: "TIMEOUT", label: "Timeout" },
  { value: "PAYLOAD_TOO_LARGE", label: "Payload Too Large" },
  { value: "PROCESSING_ERROR", label: "Processing Error" },
] as const

// ─── Dynamic config fields per alert type ────────────────────────────────────

function DeliveryFailureRateFields() {
  const form = useFormContext<AlertFormValues>()
  return (
    <div className="flex gap-3">
      <FormField
        control={form.control}
        name="config.threshold"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Failure Threshold (%)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={100}
                placeholder="50"
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="config.windowMinutes"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Window (minutes)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                placeholder="10"
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function DeliveryErrorCodeFields() {
  const form = useFormContext<AlertFormValues>()
  return (
    <FormField
      control={form.control}
      name="config.errorCode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Error Code</FormLabel>
          <Select onValueChange={field.onChange} value={field.value as string | undefined}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select error code" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {DELIVERY_ERROR_CODE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function EventFailedFields() {
  const form = useFormContext<AlertFormValues>()
  const statuses = (form.watch("config.statuses") ?? []) as string[]

  const toggle = (status: string) => {
    const current = statuses.includes(status)
      ? statuses.filter((s) => s !== status)
      : [...statuses, status]
    form.setValue("config.statuses", current, { shouldValidate: true })
  }

  return (
    <FormField
      control={form.control}
      name="config.statuses"
      render={() => (
        <FormItem>
          <FormLabel>Trigger on statuses</FormLabel>
          <div className="flex gap-2">
            {(["FAILED", "DEAD_LETTER"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                variant={statuses.includes(status) ? "default" : "outline"}
                onClick={() => toggle(status)}
                className="h-8"
              >
                {status}
              </Button>
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function EndpointSilenceFields() {
  const form = useFormContext<AlertFormValues>()
  return (
    <FormField
      control={form.control}
      name="config.windowMinutes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Silence window (minutes)</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={1}
              placeholder="30"
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ─── Main shared fields component ─────────────────────────────────────────────

export function AlertFormFields() {
  const form = useFormContext<AlertFormValues>()
  const endpointOptionsQuery = useAlertEndpointOptionsQuery()
  const type = form.watch("type")

  React.useEffect(() => {
    if (!type) return
    const currentConfig = form.getValues("config")
    if (Object.keys(currentConfig ?? {}).length > 0) return
    form.setValue("config", alertFormConfigDefaults[type], { shouldValidate: true })
  }, [form, type])

  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Alert Name <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input placeholder="e.g. High failure rate on Stripe" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Type + Severity */}
      <div className="flex gap-3">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Alert Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ALERT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Severity</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ALERT_SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Dynamic config fields */}
      {type === "DELIVERY_FAILURE_RATE" && <DeliveryFailureRateFields />}
      {type === "DELIVERY_ERROR_CODE" && <DeliveryErrorCodeFields />}
      {type === "EVENT_FAILED" && <EventFailedFields />}
      {type === "ENDPOINT_SILENCE" && <EndpointSilenceFields />}

      {/* Endpoint ID (optional) */}
      <FormField
        control={form.control}
        name="endpointId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Endpoint <span className="text-muted-foreground">(optional)</span></FormLabel>
            <Select
              value={field.value ?? "all"}
              onValueChange={(value) => field.onChange(value === "all" ? null : value)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="All endpoints" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="all">All endpoints</SelectItem>
                {(endpointOptionsQuery.data ?? []).map((endpoint) => (
                  <SelectItem key={endpoint.id} value={endpoint.id}>
                    {endpoint.name} ({endpoint.projectName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
