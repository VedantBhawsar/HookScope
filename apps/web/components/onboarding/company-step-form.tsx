import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LoaderCircle } from "lucide-react"
import { Button } from "@hookscope/ui/components/button"
import { Input } from "@hookscope/ui/components/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hookscope/ui/components/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hookscope/ui/components/select"

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const
const COMPANY_ROLES = ["Engineering", "Product", "DevOps", "Founder", "Other"] as const
const USE_CASES = [
  "Payment & billing",
  "CI/CD & deployment",
  "E-commerce",
  "Customer notifications",
  "Internal tooling",
  "Other",
] as const

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
    resolver: zodResolver(companySchema),
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  return (
    <Form {...form}>
      <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COMPANY_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
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
          name="companySize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Team size
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
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
          name="useCase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Primary use case
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary use case" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {USE_CASES.map((uc) => (
                    <SelectItem key={uc} value={uc}>
                      {uc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" className="min-h-11" disabled={isPending}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Saving..." : "Save and continue"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
