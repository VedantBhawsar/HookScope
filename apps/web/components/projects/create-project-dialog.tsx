"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { getRequestErrorMessage } from "@/lib/http"
import { useCreateProjectMutation, type ProjectRecord } from "@/hooks/use-projects"

const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
})

type CreateProjectFormValues = z.infer<typeof createProjectSchema>

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (project: ProjectRecord) => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const createProjectMutation = useCreateProjectMutation()
  const form = useForm<CreateProjectFormValues>({
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const resetForm = () => {
    form.reset()
    createProjectMutation.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = async (values: CreateProjectFormValues) => {
    form.clearErrors()
    const parsedValues = createProjectSchema.safeParse(values)

    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const fieldName = issue.path[0]
        if (fieldName === "name" || fieldName === "description") {
          form.setError(fieldName, { type: "manual", message: issue.message })
        }
      }
      return
    }

    try {
      const project = await createProjectMutation.mutateAsync({
        name: parsedValues.data.name,
        description: parsedValues.data.description?.trim() || undefined,
      })

      onCreated(project)
      handleOpenChange(false)
    } catch {
      // Error is rendered in the dialog.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id="create-project-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input required autoFocus placeholder="e.g. Payments Webhooks" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What is this project for?"
                      rows={3}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {createProjectMutation.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getRequestErrorMessage(createProjectMutation.error)}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {createProjectMutation.isPending ? "Creating…" : "Create & Open"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
