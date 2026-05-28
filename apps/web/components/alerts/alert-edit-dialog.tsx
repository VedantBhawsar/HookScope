"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@hookscope/ui/components/dialog"
import { Form } from "@hookscope/ui/components/form"
import { Button } from "@hookscope/ui/components/button"
import { useUpdateAlertMutation, type AlertRecord } from "@/hooks/use-alerts"
import { AlertFormFields } from "./alert-form-fields"
import { alertFormConfigDefaults, alertFormSchema, type AlertFormValues } from "./alert-form-schema"
import { getRequestErrorMessage } from "@/lib/http"

interface AlertEditDialogProps {
  alert: AlertRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AlertEditDialog({ alert, open, onOpenChange }: AlertEditDialogProps) {
  const updateMutation = useUpdateAlertMutation()

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      name: alert.name,
      type: alert.type,
      severity: alert.severity,
      endpointId: alert.endpointId ?? null,
      config: (alert.config as Record<string, unknown>) ?? alertFormConfigDefaults[alert.type],
      isActive: alert.isActive,
    },
  })

  // Reset form when alert changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: alert.name,
        type: alert.type,
        severity: alert.severity,
        endpointId: alert.endpointId ?? null,
        config: (alert.config as Record<string, unknown>) ?? alertFormConfigDefaults[alert.type],
        isActive: alert.isActive,
      })
    }
  }, [alert, open, form])

  const onSubmit = async (values: AlertFormValues) => {
    try {
      const result = await updateMutation.mutateAsync({
        id: alert.id,
        name: values.name,
        type: values.type,
        severity: values.severity,
        endpointId: values.endpointId ?? null,
        config: values.config,
        isActive: values.isActive,
      })
      toast.success(result.message ?? "Alert updated")
      onOpenChange(false)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Alert</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <AlertFormFields />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
