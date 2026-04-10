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
import { useUpdateProjectMutation, type ProjectRecord } from "@/hooks/use-projects"

const editProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
})

type EditProjectFormValues = z.infer<typeof editProjectSchema>

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectRecord | null
  onUpdated?: (project: ProjectRecord) => void
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onUpdated,
}: EditProjectDialogProps) {
  const updateProjectMutation = useUpdateProjectMutation()
  const resetUpdateProjectMutation = updateProjectMutation.reset
  const form = useForm<EditProjectFormValues>({
    defaultValues: {
      name: "",
      description: "",
    },
  })

  React.useEffect(() => {
    if (!open || !project) return

    form.reset({
      name: project.name,
      description: project.description ?? "",
    })
    resetUpdateProjectMutation()
  }, [form, open, project, resetUpdateProjectMutation])

  const resetForm = () => {
    form.reset({ name: "", description: "" })
    resetUpdateProjectMutation()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = async (values: EditProjectFormValues) => {
    if (!project) return

    form.clearErrors()
    const parsedValues = editProjectSchema.safeParse(values)

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
      const updatedProject = await updateProjectMutation.mutateAsync({
        id: project.id,
        name: parsedValues.data.name,
        description: parsedValues.data.description?.trim() || undefined,
      })

      onUpdated?.(updatedProject)
      handleOpenChange(false)
    } catch {
      // Error is rendered in the dialog.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id="edit-project-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input required autoFocus placeholder="Project name" className="h-9" {...field} />
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
                      placeholder="Project description"
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

            {updateProjectMutation.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getRequestErrorMessage(updateProjectMutation.error)}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProjectMutation.isPending || !project}>
                {updateProjectMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {updateProjectMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
