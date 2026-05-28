"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@hookscope/ui/components/dialog"
import { Form } from "@hookscope/ui/components/form"
import { useCreateAlertMutation } from "@/hooks/use-alerts"
import { AlertFormFields } from "./alert-form-fields"
import { alertFormConfigDefaults, alertFormSchema, type AlertFormValues } from "./alert-form-schema"
import { getRequestErrorMessage } from "@/lib/http"

export function AlertCreateDialog() {
  const [open, setOpen] = React.useState(false)
  const createMutation = useCreateAlertMutation()

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      name: "",
      type: "DELIVERY_ERROR_CODE",
      severity: "WARNING",
      config: alertFormConfigDefaults.DELIVERY_ERROR_CODE,
      isActive: true,
    },
  })

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) form.reset()
  }

  const onSubmit = async (values: AlertFormValues) => {
    try {
      const result = await createMutation.mutateAsync({
        name: values.name,
        type: values.type,
        severity: values.severity,
        endpointId: values.endpointId ?? null,
        config: values.config,
        isActive: values.isActive,
      })
      toast.success(result.message ?? "Alert created")
      handleOpenChange(false)
    } catch (err) {
      toast.error(getRequestErrorMessage(err))
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Create Alert
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Alert</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <AlertFormFields />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Alert"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
