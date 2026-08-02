import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LoaderCircle } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import { Input } from "@hookscope/ui/components/input"
import { Textarea } from "@hookscope/ui/components/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hookscope/ui/components/form"

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectStepFormProps {
  disabled: boolean
  isPending: boolean
  onBack: () => void
  onSubmit: (values: ProjectFormValues) => Promise<void>
}

export function ProjectStepForm({ disabled, isPending, onBack, onSubmit }: ProjectStepFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", description: "" },
  })

  return (
    <Form {...form}>
      <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Project name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Payments Webhooks" autoFocus {...field} />
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
                  placeholder="Capture and inspect Stripe events"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" className="min-h-11" disabled={isPending || disabled}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Creating project..." : "Create project"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
