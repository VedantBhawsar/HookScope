import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { LoaderCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"

export const companySchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  companyRole: z.string().optional(),
  companySize: z.string().optional(),
  useCase: z.string().optional(),
})

export type CompanyFormValues = z.infer<typeof companySchema>

interface CompanyStepFormProps {
  defaultValues: CompanyFormValues
  isPending: boolean
  onBack: () => void
  onSubmit: (values: CompanyFormValues) => Promise<void>
}

export function CompanyStepForm({ defaultValues, isPending, onBack, onSubmit }: CompanyStepFormProps) {
  const form = useForm<CompanyFormValues>({
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const handleSubmit = async (values: CompanyFormValues) => {
    form.clearErrors()
    const parsedValues = companySchema.safeParse(values)

    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const fieldName = issue.path[0]
        if (
          fieldName === "companyName" ||
          fieldName === "companyRole" ||
          fieldName === "companySize" ||
          fieldName === "useCase"
        ) {
          form.setError(fieldName, { type: "manual", message: issue.message })
        }
      }
      return
    }

    await onSubmit(parsedValues.data)
  }

  return (
    <Form {...form}>
      <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Company name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Your role
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Founder, Engineering Manager, Developer" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companySize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Team size
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="1-10, 11-50, 51-200" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="useCase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Primary use case
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Observe Stripe and GitHub webhooks" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Saving..." : "Save and continue"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
